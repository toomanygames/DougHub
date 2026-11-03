-- Admin panel redesign: one rank system (Helper 1 < Admin 2 < Developer 3 < Owner 4), protected audit log,
-- server-side logging of sensitive actions, user reports, and "staff since" tracking.
-- staff_role is authoritative everywhere (legacy is_* flags are not trusted, except is_owner).

-- 1. Rank of the current (or given) user. 'tech' counts as Developer.
create or replace function private.dh_staff_rank(p_user uuid default auth.uid())
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when p.is_owner is true or lower(coalesce(p.staff_role,'')) = 'owner' then 4
      when lower(coalesce(p.staff_role,'')) in ('developer','tech') then 3
      when lower(coalesce(p.staff_role,'')) = 'admin' then 2
      when lower(coalesce(p.staff_role,'')) = 'helper' then 1
      else 0 end
    from public.profiles p where p.id = p_user), 0);
$$;
revoke all on function private.dh_staff_rank(uuid) from public, anon;
grant execute on function private.dh_staff_rank(uuid) to authenticated;
create or replace function public.dh_my_staff_rank() returns integer language sql stable security invoker set search_path = '' as $$ select private.dh_staff_rank() $$;
revoke all on function public.dh_my_staff_rank() from public, anon;
grant execute on function public.dh_my_staff_rank() to authenticated;

-- 2. Chat: Admin+ approve; every staff rank can use chat without approval.
create or replace function private.dh_is_chat_approver() returns boolean language sql stable security definer set search_path = '' as $$
  select private.dh_staff_rank() >= 2;
$$;
create or replace function private.dh_can_use_chat() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
      and (private.dh_staff_rank() >= 1 or exists (select 1 from public.chat_access_approvals a where a.user_id = u.id))
  );
$$;

-- 3. Audit log: extra columns, staff-only writes, Admin+ reads, no edits, Owner-only deletes.
alter table public.admin_audit_logs add column if not exists target_id uuid;
alter table public.admin_audit_logs add column if not exists success boolean not null default true;
alter table public.admin_audit_logs add column if not exists source text not null default 'client';
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
drop policy if exists "Users can record their own audit events" on public.admin_audit_logs;
drop policy if exists "Staff record their own audit events" on public.admin_audit_logs;
create policy "Staff record their own audit events" on public.admin_audit_logs for insert to authenticated
  with check (actor_id = (select auth.uid()) and source = 'client' and success
    and (private.dh_staff_rank() >= 1 or category = 'authentication'));
drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs" on public.admin_audit_logs for select to authenticated using (private.dh_staff_rank() >= 2);
revoke update on public.admin_audit_logs from anon, authenticated;

create or replace function private.dh_audit(p_category text, p_action text, p_target uuid, p_success boolean default true, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_logs(actor_id, event_type, category, action, target_id, success, source, details)
  values ((select auth.uid()), 'admin_action', p_category, p_action, p_target, p_success, 'server', coalesce(p_details, '{}'::jsonb));
end $$;
revoke all on function private.dh_audit(text, text, uuid, boolean, jsonb) from public, anon, authenticated;

-- 4. Chat approval logs every decision.
create or replace function public.dh_set_chat_verified(p_user_id uuid, p_verified boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.dh_is_chat_approver() then
    raise exception 'Only Admin or higher staff can change chat access.';
  end if;
  if coalesce(p_verified, false) then
    insert into public.chat_access_approvals(user_id, approved_by, approved_at)
    values (p_user_id, (select auth.uid()), now())
    on conflict (user_id) do update set approved_by = excluded.approved_by, approved_at = excluded.approved_at;
  else
    delete from public.chat_access_approvals where user_id = p_user_id;
  end if;
  delete from public.chat_access_requests where user_id = p_user_id;
  perform private.dh_audit('chat', case when coalesce(p_verified,false) then 'Approved chat access' else 'Revoked chat access' end, p_user_id);
  return true;
end $$;
create or replace function public.dh_deny_chat_request(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not private.dh_is_chat_approver() then raise exception 'Only Admin or higher staff can review chat requests.'; end if;
  delete from public.chat_access_requests where user_id = p_user_id;
  perform private.dh_audit('chat', 'Denied chat access request', p_user_id);
  return true;
end $$;
revoke all on function public.dh_deny_chat_request(uuid) from public, anon;
grant execute on function public.dh_deny_chat_request(uuid) to authenticated;

-- 5. Warnings: Helpers and up send and read; Admins and up delete. Every warning is logged.
drop policy if exists "Admins can send warnings" on public.user_warnings;
create policy "Staff can send warnings" on public.user_warnings for insert to authenticated with check (private.dh_staff_rank() >= 1);
drop policy if exists "Admins can view all warnings" on public.user_warnings;
create policy "Staff can view all warnings" on public.user_warnings for select to authenticated using (private.dh_staff_rank() >= 1);
drop policy if exists "Admins can delete warnings" on public.user_warnings;
create policy "Admins can delete warnings" on public.user_warnings for delete to authenticated using (private.dh_staff_rank() >= 2);
create or replace function private.dh_log_warning() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then perform private.dh_audit('moderation', 'Issued a warning', new.user_id, true, jsonb_build_object('warningId', new.id)); end if;
  return new;
end $$;
drop trigger if exists dh_log_warning on public.user_warnings;
create trigger dh_log_warning after insert on public.user_warnings for each row execute function private.dh_log_warning();

-- 6. Ban requests (Developers must ask; the Owner reviews): log requests and reviews.
create or replace function private.dh_log_ban_request() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.dh_audit('moderation', 'Requested a ' || coalesce(new.ban_type,'ban') || ' (needs Owner review)', new.target_user_id, true, jsonb_build_object('requestId', new.id));
  elsif new.status is distinct from old.status then
    perform private.dh_audit('moderation', 'Ban request ' || new.status, new.target_user_id, true, jsonb_build_object('requestId', new.id));
  end if;
  return new;
end $$;
drop trigger if exists dh_log_ban_request on public.staff_ban_requests;
create trigger dh_log_ban_request after insert or update on public.staff_ban_requests for each row execute function private.dh_log_ban_request();

-- 7. User reports: members report, Helpers and up review through a logged RPC.
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete cascade,
  category text not null default 'other' check (category in ('chat','dm','game','profile','other')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  context text check (context is null or char_length(context) <= 300),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists user_reports_status_idx on public.user_reports(status, created_at desc);
alter table public.user_reports enable row level security;
drop policy if exists "Members file reports" on public.user_reports;
create policy "Members file reports" on public.user_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and handled_by is null
    and (target_user_id is null or target_user_id <> (select auth.uid())));
drop policy if exists "Reporters and staff read reports" on public.user_reports;
create policy "Reporters and staff read reports" on public.user_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.dh_staff_rank() >= 1);
revoke update, delete on public.user_reports from anon, authenticated;
revoke all on public.user_reports from anon;
grant select, insert on public.user_reports to authenticated;
-- At most 10 open reports per member, so the queue can't be flooded.
create or replace function private.dh_limit_reports() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.user_reports where reporter_id = new.reporter_id and status = 'open') >= 10 then
    raise exception 'You already have 10 open reports. Staff will review them soon.';
  end if;
  return new;
end $$;
drop trigger if exists dh_limit_reports on public.user_reports;
create trigger dh_limit_reports before insert on public.user_reports for each row execute function private.dh_limit_reports();
create or replace function public.dh_handle_report(p_report_id uuid, p_status text, p_note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_target uuid;
begin
  if private.dh_staff_rank() < 1 then raise exception 'Only staff can handle reports.'; end if;
  if p_status not in ('open','resolved','dismissed') then raise exception 'Unknown report status.'; end if;
  update public.user_reports set status = p_status,
    handled_by = case when p_status = 'open' then null else (select auth.uid()) end,
    handled_at = case when p_status = 'open' then null else now() end,
    resolution_note = left(nullif(btrim(coalesce(p_note,'')), ''), 300)
  where id = p_report_id returning target_user_id into v_target;
  if not found then raise exception 'Report not found.'; end if;
  perform private.dh_audit('moderation', 'Marked a report ' || p_status, v_target, true, jsonb_build_object('reportId', p_report_id));
  return true;
end $$;
revoke all on function public.dh_handle_report(uuid, text, text) from public, anon;
grant execute on function public.dh_handle_report(uuid, text, text) to authenticated;

-- 8. Staff since: set when someone joins the staff, cleared when they leave; nobody can edit it directly.
alter table public.profiles add column if not exists staff_since timestamptz;
create or replace function private.dh_track_staff_since() returns trigger language plpgsql set search_path = '' as $$
declare was_staff boolean; is_staff boolean;
begin
  if tg_op = 'INSERT' then new.staff_since := null; return new; end if;
  was_staff := lower(coalesce(old.staff_role,'none')) not in ('','none');
  is_staff := lower(coalesce(new.staff_role,'none')) not in ('','none');
  if is_staff and not was_staff then new.staff_since := now();
  elsif not is_staff then new.staff_since := null;
  else new.staff_since := coalesce(old.staff_since, now()); end if;
  return new;
end $$;
drop trigger if exists dh_track_staff_since on public.profiles;
create trigger dh_track_staff_since before insert or update on public.profiles for each row execute function private.dh_track_staff_since();
-- Backfill existing staff from the earliest logged rank change (other profile triggers paused for this one update).
alter table public.profiles disable trigger user;
update public.profiles p set staff_since = coalesce((
  select min(l.created_at) from public.admin_audit_logs l
  where l.details->>'targetUserId' = p.id::text and l.details->'changedFields' ? 'staff_role_or_privileges'), p.created_at, now())
where lower(coalesce(p.staff_role,'none')) not in ('','none') and p.staff_since is null;
alter table public.profiles enable trigger user;
-- Rank changes stay with the existing Owner-only, password-checked flow (protect_profile_staff_roles + Edge Function).
