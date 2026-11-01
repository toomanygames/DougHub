
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_username text;
  final_username text;
  suffix text;
  requested_account_type text;
begin
  requested_username := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'User');
  final_username := requested_username;
  requested_account_type := lower(coalesce(new.raw_user_meta_data->>'account_type', 'neither'));
  if requested_account_type not in ('student', 'teacher', 'neither') then
    requested_account_type := 'neither';
  end if;

  if exists (select 1 from public.profiles where username = final_username) then
    suffix := substr(replace(new.id::text, '-', ''), 1, 6);
    final_username := requested_username || '_' || suffix;
  end if;

  insert into public.profiles (id, username, account_type, teacher_verified)
  values (new.id, final_username, requested_account_type, false);

  return new;
end;
$function$;

drop policy if exists "teachers request enrollment" on public.classroom_enrollments;
drop policy if exists "owners verify enrollment" on public.classroom_enrollments;

create policy "students request their own classroom enrollment"
on public.classroom_enrollments
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and requested_by = (select auth.uid())
  and status = 'pending'
  and verified_by is null
  and verified_at is null
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_type = 'student'
  )
  and exists (
    select 1 from public.classroom_spaces c
    where c.id = classroom_enrollments.classroom_id
  )
);

create policy "classroom teachers decide student requests"
on public.classroom_enrollments
for update
to authenticated
using (
  status = 'pending'
  and private.is_classroom_teacher(classroom_id)
)
with check (
  private.is_classroom_teacher(classroom_id)
  and status in ('approved', 'rejected')
  and verified_by = (select auth.uid())
  and verified_at is not null
);

create policy "students can retry rejected classroom requests"
on public.classroom_enrollments
for update
to authenticated
using (
  student_id = (select auth.uid())
  and status = 'rejected'
)
with check (
  student_id = (select auth.uid())
  and requested_by = (select auth.uid())
  and status = 'pending'
  and verified_by is null
  and verified_at is null
);

create policy "students can discover classrooms"
on public.classroom_spaces
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_type = 'student'
  )
);
