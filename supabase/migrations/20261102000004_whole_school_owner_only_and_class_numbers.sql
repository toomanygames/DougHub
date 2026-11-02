create or replace function private.dh_set_whole_school_mode(p_enabled boolean)
returns boolean
language plpgsql
security definer
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
    select 1
    from public.profiles p
    where p.id = v_user_id
      and (
        p.is_owner is true
        or lower(coalesce(p.staff_role, '')) = 'owner'
      )
  ) then
    raise exception 'Only the Owner can change Whole School Mode.';
  end if;

  select whole_school_classroom_id
    into v_classroom_id
  from public.classroom_school_settings
  where singleton is true;

  if coalesce(p_enabled, false) and v_classroom_id is null then
    insert into public.classroom_spaces
      (teacher_id, grade, class_name, reminder, session_active)
    values
      (v_user_id, 0, 'Whole School', 'School-wide class chat', true)
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
language sql
security invoker
set search_path = ''
as $$
  select private.dh_set_whole_school_mode(p_enabled);
$$;

revoke all on function private.dh_set_whole_school_mode(boolean) from public, anon;
grant execute on function private.dh_set_whole_school_mode(boolean) to authenticated;
revoke all on function public.dh_set_whole_school_mode(boolean) from public, anon;
grant execute on function public.dh_set_whole_school_mode(boolean) to authenticated;
