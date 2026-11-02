create table if not exists public.classroom_school_settings (
  singleton boolean primary key default true check (singleton is true),
  whole_school_enabled boolean not null default false,
  whole_school_classroom_id uuid references public.classroom_spaces(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.classroom_school_settings (singleton, whole_school_enabled)
values (true, false)
on conflict (singleton) do nothing;

alter table public.classroom_school_settings enable row level security;
drop policy if exists "signed-in users can read whole school mode" on public.classroom_school_settings;
create policy "signed-in users can read whole school mode"
on public.classroom_school_settings for select to authenticated using (true);
revoke all on public.classroom_school_settings from anon, authenticated;
grant select on public.classroom_school_settings to authenticated;

create or replace function private.is_whole_school_classroom_member(p_classroom_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classroom_school_settings s
    join public.profiles p on p.id = (select auth.uid())
    where s.singleton is true
      and s.whole_school_enabled is true
      and s.whole_school_classroom_id = p_classroom_id
      and p.account_type = 'student'
      and not exists (
        select 1 from public.classroom_enrollments e
        where e.student_id = p.id
          and e.status = 'approved'
          and e.classroom_id <> s.whole_school_classroom_id
      )
  );
$$;

grant execute on function private.is_whole_school_classroom_member(uuid) to authenticated;

create or replace function private.is_classroom_member(p_classroom_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.classroom_enrollments e
      where e.classroom_id = p_classroom_id
        and e.student_id = (select auth.uid())
        and e.status = 'approved'
    )
    or private.is_whole_school_classroom_member(p_classroom_id);
$$;

grant execute on function private.is_classroom_member(uuid) to authenticated;

create or replace function private.dh_set_whole_school_mode(p_enabled boolean)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_classroom_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in is required.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id
      and (
        p.is_admin is true
        or p.is_owner is true
        or lower(coalesce(p.staff_role, '')) in ('admin', 'owner')
      )
  ) then
    raise exception 'Admin access is required.';
  end if;

  select whole_school_classroom_id into v_classroom_id
  from public.classroom_school_settings
  where singleton is true;

  if p_enabled and v_classroom_id is null then
    insert into public.classroom_spaces
      (teacher_id, grade, class_name, reminder, session_active)
    values
      (v_user_id, 5, 'Whole School', 'School-wide class chat', true)
    returning id into v_classroom_id;
  end if;

  update public.classroom_school_settings
  set whole_school_enabled = coalesce(p_enabled, false),
      whole_school_classroom_id = v_classroom_id,
      updated_by = v_user_id,
      updated_at = now()
  where singleton is true;

  return coalesce(p_enabled, false);
end;
$$;

create or replace function public.dh_set_whole_school_mode(p_enabled boolean)
returns boolean
language sql security invoker
set search_path = ''
as $$
  select private.dh_set_whole_school_mode(p_enabled);
$$;

revoke all on function private.dh_set_whole_school_mode(boolean) from public, anon;
grant execute on function private.dh_set_whole_school_mode(boolean) to authenticated;
revoke all on function public.dh_set_whole_school_mode(boolean) from public, anon;
grant execute on function public.dh_set_whole_school_mode(boolean) to authenticated;

create or replace function private.dh_get_whole_school_classroom_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.whole_school_classroom_id
  from public.classroom_school_settings s
  join public.profiles p on p.id = (select auth.uid())
  where s.singleton is true
    and s.whole_school_enabled is true
    and p.account_type = 'student'
    and not exists (
      select 1 from public.classroom_enrollments e
      where e.student_id = p.id
        and e.status = 'approved'
        and e.classroom_id <> s.whole_school_classroom_id
    )
  limit 1;
$$;

create or replace function public.dh_get_whole_school_classroom_id()
returns uuid
language sql security invoker
set search_path = ''
as $$
  select private.dh_get_whole_school_classroom_id();
$$;

revoke all on function private.dh_get_whole_school_classroom_id() from public, anon;
grant execute on function private.dh_get_whole_school_classroom_id() to authenticated;
revoke all on function public.dh_get_whole_school_classroom_id() from public, anon;
grant execute on function public.dh_get_whole_school_classroom_id() to authenticated;

drop policy if exists "active class participants and online preview staff can chat" on public.classroom_chat_messages;
create policy "active class participants and online preview staff can chat"
on public.classroom_chat_messages for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.classroom_spaces c
    where c.id = classroom_chat_messages.classroom_id
      and c.session_active is true
      and (
        private.is_whole_school_classroom_member(c.id)
        or (
          private.is_classroom_teacher_online(c.id)
          and (
            private.is_classroom_teacher(c.id)
            or private.is_classroom_member(c.id)
            or private.is_classroom_preview_staff()
          )
        )
      )
  )
);
