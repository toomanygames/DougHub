-- Tech is above Admin in the staff ladder and is included in Admin+ chat approval.
create or replace function public.dh_is_chat_approver()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        lower(coalesce(p.staff_role, '')) in ('admin','developer','tech','owner')
        or p.is_admin is true
        or p.is_developer is true
        or p.is_owner is true
      )
  );
$$;

revoke all on function public.dh_is_chat_approver() from public;

create or replace function public.dh_can_use_chat()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and (p.chat_verified is true or public.dh_is_chat_approver())
  );
$$;

create or replace function public.dh_protect_chat_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.dh_is_chat_approver() then
    if tg_op = 'INSERT' then
      new.chat_verified := false;
      new.chat_verified_at := null;
      new.chat_verified_by := null;
    else
      new.chat_verified := old.chat_verified;
      new.chat_verified_at := old.chat_verified_at;
      new.chat_verified_by := old.chat_verified_by;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.dh_set_chat_verified(p_user_id uuid, p_verified boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.dh_is_chat_approver() then
    raise exception 'Only Admin+ staff can change chat verification.';
  end if;

  update public.profiles
  set chat_verified = coalesce(p_verified, false),
      chat_verified_at = case when coalesce(p_verified, false) then now() else null end,
      chat_verified_by = case when coalesce(p_verified, false) then (select auth.uid()) else null end
  where id = p_user_id;

  if not found then
    raise exception 'User profile not found.';
  end if;

  return true;
end;
$$;
