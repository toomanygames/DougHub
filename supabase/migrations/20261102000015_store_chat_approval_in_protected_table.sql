-- Store chat approval in a protected table so profile self-updates cannot grant access.
create table if not exists public.chat_access_approvals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now()
);
alter table public.chat_access_approvals enable row level security;
grant select on public.chat_access_approvals to authenticated;
grant execute on function private.dh_is_chat_approver() to authenticated;
drop policy if exists "Users can view own chat approval" on public.chat_access_approvals;
create policy "Users can view own chat approval"
on public.chat_access_approvals
for select to authenticated
using (user_id = (select auth.uid()) or private.dh_is_chat_approver());

create or replace function private.dh_can_use_chat()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and (
        private.dh_is_chat_approver()
        or exists (
          select 1 from public.chat_access_approvals a where a.user_id = u.id
        )
      )
  );
$$;
revoke all on function private.dh_can_use_chat() from public;
grant execute on function private.dh_can_use_chat() to anon, authenticated;

create or replace function public.dh_set_chat_verified(p_user_id uuid, p_verified boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.dh_is_chat_approver() then
    raise exception 'Only Admin+ staff can change chat verification.';
  end if;

  if coalesce(p_verified, false) then
    insert into public.chat_access_approvals(user_id, approved_by, approved_at)
    values (p_user_id, (select auth.uid()), now())
    on conflict (user_id) do update
      set approved_by = excluded.approved_by,
          approved_at = excluded.approved_at;
  else
    delete from public.chat_access_approvals where user_id = p_user_id;
  end if;

  return true;
end;
$$;
revoke all on function public.dh_set_chat_verified(uuid, boolean) from public, anon;
grant execute on function public.dh_set_chat_verified(uuid, boolean) to authenticated;

drop trigger if exists protect_chat_verification_fields on public.profiles;
drop function if exists private.dh_protect_chat_verification_fields();
alter table public.profiles
  drop column if exists chat_verified_by,
  drop column if exists chat_verified_at,
  drop column if exists chat_verified;
