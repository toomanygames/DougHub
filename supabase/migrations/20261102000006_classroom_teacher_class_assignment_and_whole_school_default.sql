create or replace function private.validate_classroom_grade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
 if new.grade < 1 or new.grade > 9999 then
   raise exception 'Class number must be between 1 and 9999.';
 end if;
 return new;
end;
$$;

alter table public.classroom_teacher_applications
  add column if not exists assigned_grade smallint;

alter table public.classroom_teacher_applications
  drop constraint if exists classroom_teacher_applications_assigned_grade_check;
alter table public.classroom_teacher_applications
  add constraint classroom_teacher_applications_assigned_grade_check
  check (assigned_grade is null or assigned_grade between 1 and 9999);

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
      and not exists (
        select 1 from public.classroom_enrollments e
        where e.student_id = p.id and e.status = 'approved'
          and e.classroom_id <> s.whole_school_classroom_id
      )
      and not exists (
        select 1 from public.classroom_spaces c
        where c.teacher_id = p.id and c.id <> s.whole_school_classroom_id
      )
  );
$$;
grant execute on function private.is_whole_school_classroom_member(uuid) to authenticated;

create or replace function private.dh_get_whole_school_classroom_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.whole_school_classroom_id
  from public.classroom_school_settings s
  join public.profiles p on p.id = (select auth.uid())
  where s.singleton is true and s.whole_school_enabled is true
    and not exists (
      select 1 from public.classroom_enrollments e
      where e.student_id = p.id and e.status = 'approved'
        and e.classroom_id <> s.whole_school_classroom_id
    )
    and not exists (
      select 1 from public.classroom_spaces c
      where c.teacher_id = p.id and c.id <> s.whole_school_classroom_id
    )
  limit 1;
$$;

create or replace function public.dh_get_whole_school_classroom_id()
returns uuid
language sql security invoker
set search_path = ''
as $$ select private.dh_get_whole_school_classroom_id(); $$;
revoke all on function private.dh_get_whole_school_classroom_id() from public, anon;
grant execute on function private.dh_get_whole_school_classroom_id() to authenticated;
revoke all on function public.dh_get_whole_school_classroom_id() from public, anon;
grant execute on function public.dh_get_whole_school_classroom_id() to authenticated;

create or replace function private.dh_approve_teacher_application(p_application_id uuid,p_grade integer)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_teacher_id uuid;
  v_teacher_name text;
  v_classroom_id uuid;
  v_class_name text;
begin
  if v_owner_id is null or not private.is_classroom_owner() then
    raise exception 'Only the Owner can approve teacher applications.';
  end if;
  if p_grade is null or p_grade < 1 or p_grade > 9999 then
    raise exception 'Enter a class number from 1 to 9999.';
  end if;

  select a.user_id into v_teacher_id
  from public.classroom_teacher_applications a
  where a.id=p_application_id and a.status='pending'
  for update;
  if v_teacher_id is null then raise exception 'This teacher application is no longer pending.'; end if;

  select coalesce(nullif(trim(p.username),''),'Teacher') into v_teacher_name
  from public.profiles p where p.id=v_teacher_id;
  v_class_name := left('Class '||p_grade||' · '||v_teacher_name,80);

  select c.id into v_classroom_id from public.classroom_spaces c
  where c.teacher_id=v_teacher_id order by c.created_at asc limit 1;

  if v_classroom_id is null then
    insert into public.classroom_spaces(teacher_id,grade,class_name,reminder,session_active)
    values(v_teacher_id,p_grade,v_class_name,'',true) returning id into v_classroom_id;
  else
    update public.classroom_spaces set grade=p_grade,class_name=v_class_name,updated_at=now()
    where id=v_classroom_id;
  end if;

  update public.profiles set account_type='teacher',teacher_verified=true where id=v_teacher_id;
  update public.classroom_teacher_applications
  set status='approved',assigned_grade=p_grade,reviewed_by=v_owner_id,reviewed_at=now()
  where id=p_application_id;
  return v_classroom_id;
end;
$$;

create or replace function public.dh_approve_teacher_application(p_application_id uuid,p_grade integer)
returns uuid
language sql security invoker set search_path = ''
as $$ select private.dh_approve_teacher_application(p_application_id,p_grade); $$;
revoke all on function private.dh_approve_teacher_application(uuid,integer) from public,anon;
grant execute on function private.dh_approve_teacher_application(uuid,integer) to authenticated;
revoke all on function public.dh_approve_teacher_application(uuid,integer) from public,anon;
grant execute on function public.dh_approve_teacher_application(uuid,integer) to authenticated;

do $$
declare v_owner_id uuid; v_whole_school_id uuid;
begin
 select p.id into v_owner_id from public.profiles p
 where p.is_owner is true or lower(coalesce(p.staff_role,''))='owner'
 order by p.is_owner desc limit 1;
 if v_owner_id is null then raise exception 'Owner profile was not found.'; end if;

 select c.id into v_whole_school_id from public.classroom_spaces c
 where c.teacher_id=v_owner_id order by c.created_at asc limit 1;

 if v_whole_school_id is null then
  insert into public.classroom_spaces(teacher_id,grade,class_name,reminder,session_active)
  values(v_owner_id,1,'Whole School','Welcome to your school-wide classroom.',true)
  returning id into v_whole_school_id;
 else
  update public.classroom_spaces set grade=1,class_name='Whole School',
   reminder='Welcome to your school-wide classroom.',session_active=true,updated_at=now()
  where id=v_whole_school_id;
 end if;

 update public.classroom_school_settings set whole_school_enabled=true,
  whole_school_classroom_id=v_whole_school_id,updated_by=v_owner_id,updated_at=now()
 where singleton is true;
end;
$$;
