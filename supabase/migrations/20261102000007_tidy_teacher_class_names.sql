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
  v_class_name := left(format('%s''s Class',v_teacher_name),80);

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