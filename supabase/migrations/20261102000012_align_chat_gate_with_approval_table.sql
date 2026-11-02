-- Use the existing approval ledger (not nonexistent profile columns) for chat access.
-- Also remove the draft profile trigger, which is not needed because approvals are
-- stored separately and changed only through this Admin+ RPC.
drop trigger if exists protect_chat_verification_fields on public.profiles;
drop function if exists private.dh_protect_chat_verification_fields();
drop function if exists public.dh_protect_chat_verification_fields();

create or replace function private.dh_is_chat_approver()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (
        lower(coalesce(p.staff_role, '')) in ('admin','developer','tech','owner')
        or p.is_admin is true or p.is_developer is true or p.is_owner is true
      )
  );
$$;
revoke all on function private.dh_is_chat_approver() from public;

create or replace function private.dh_can_use_chat()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and (
        private.dh_is_chat_approver()
        or exists (
          select 1 from public.chat_access_approvals a
          where a.user_id = u.id
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
      set approved_by = excluded.approved_by, approved_at = excluded.approved_at;
  else
    delete from public.chat_access_approvals where user_id = p_user_id;
  end if;
  return true;
end;
$$;
revoke all on function public.dh_set_chat_verified(uuid, boolean) from public, anon;
grant execute on function public.dh_set_chat_verified(uuid, boolean) to authenticated;
