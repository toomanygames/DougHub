-- Chat is available only to email-confirmed users approved by Admin+ staff.
alter table public.profiles
  add column if not exists chat_verified boolean not null default false,
  add column if not exists chat_verified_at timestamptz,
  add column if not exists chat_verified_by uuid references public.profiles(id) on delete set null;

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
      and (p.chat_verified is true or public.is_admin_or_higher())
  );
$$;

revoke all on function public.dh_can_use_chat() from public;
grant execute on function public.dh_can_use_chat() to anon, authenticated;

create or replace function public.dh_protect_chat_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_admin_or_higher() then
    new.chat_verified := old.chat_verified;
    new.chat_verified_at := old.chat_verified_at;
    new.chat_verified_by := old.chat_verified_by;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_chat_verification_fields on public.profiles;
create trigger protect_chat_verification_fields
before update on public.profiles
for each row
execute function public.dh_protect_chat_verification_fields();

create or replace function public.dh_set_chat_verified(p_user_id uuid, p_verified boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin_or_higher() then
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

revoke all on function public.dh_set_chat_verified(uuid, boolean) from public;
grant execute on function public.dh_set_chat_verified(uuid, boolean) to authenticated;

do $$
declare
  t text;
  chat_tables text[] := array[
    'chat_messages','chat_groups','chat_group_members','chat_pinned_messages',
    'chat_games','chat_polls','chat_poll_votes','chat_retention_settings',
    'direct_messages','classroom_messages','classroom_chat_messages',
    'classroom_dm_conversations','classroom_dm_messages'
  ];
begin
  foreach t in array chat_tables loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', 'Require approved chat access', t);
      execute format(
        'create policy %I on public.%I as restrictive for all to public using (public.dh_can_use_chat()) with check (public.dh_can_use_chat())',
        'Require approved chat access', t
      );
    end if;
  end loop;
end;
$$;
