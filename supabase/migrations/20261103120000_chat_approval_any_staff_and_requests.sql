-- Chat access: any staff rank (Helper and up) can approve, and members can ask for approval.
-- Reading and sending chat is already blocked in the database for unapproved accounts by the
-- RESTRICTIVE "Require approved chat access" policies, which call private.dh_can_use_chat().

-- 1. Approvers: any staff rank. staff_role is authoritative (matches the admin panel's own check),
--    so leftover legacy flags on a demoted account no longer grant approval powers.
create or replace function private.dh_is_chat_approver()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (lower(coalesce(p.staff_role, '')) in ('helper','admin','developer','tech','owner') or p.is_owner is true)
  );
$$;

-- 2. Requests: one row per member waiting for review.
create table if not exists public.chat_access_requests (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.chat_access_requests enable row level security;
drop policy if exists "Members see own request, staff see all" on public.chat_access_requests;
create policy "Members see own request, staff see all" on public.chat_access_requests
  for select to authenticated using ((select auth.uid()) = user_id or private.dh_is_chat_approver());
drop policy if exists "Members request access for themselves" on public.chat_access_requests;
create policy "Members request access for themselves" on public.chat_access_requests
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and not exists (select 1 from public.chat_access_approvals a where a.user_id = (select auth.uid()))
  );
drop policy if exists "Members cancel, staff dismiss requests" on public.chat_access_requests;
create policy "Members cancel, staff dismiss requests" on public.chat_access_requests
  for delete to authenticated using ((select auth.uid()) = user_id or private.dh_is_chat_approver());
revoke all on public.chat_access_requests from anon;
grant select, insert, delete on public.chat_access_requests to authenticated;

-- 3. Approve or revoke; either way the member's pending request is cleared.
create or replace function public.dh_set_chat_verified(p_user_id uuid, p_verified boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.dh_is_chat_approver() then
    raise exception 'Only DougHub staff can change chat access.';
  end if;
  if coalesce(p_verified, false) then
    insert into public.chat_access_approvals(user_id, approved_by, approved_at)
    values (p_user_id, (select auth.uid()), now())
    on conflict (user_id) do update set approved_by = excluded.approved_by, approved_at = excluded.approved_at;
  else
    delete from public.chat_access_approvals where user_id = p_user_id;
  end if;
  delete from public.chat_access_requests where user_id = p_user_id;
  return true;
end;
$$;
