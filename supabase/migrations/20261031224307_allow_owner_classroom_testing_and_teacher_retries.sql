create or replace function private.is_verified_classroom_teacher()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid())
 and ((p.account_type='teacher' and p.teacher_verified is true) or p.is_owner is true or lower(coalesce(p.staff_role,''))='owner'));
$$;
create or replace function private.is_classroom_teacher(p_classroom_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.classroom_spaces c join public.profiles p on p.id=c.teacher_id
 where c.id=p_classroom_id and (
 (c.teacher_id=(select auth.uid()) and p.account_type='teacher' and p.teacher_verified is true)
 or exists(select 1 from public.profiles o where o.id=(select auth.uid()) and (o.is_owner is true or lower(coalesce(o.staff_role,''))='owner'))
 ));
$$;
drop policy if exists "applicants can retry rejected teacher requests" on public.classroom_teacher_applications;
create policy "applicants can retry rejected teacher requests" on public.classroom_teacher_applications
for update to authenticated using (user_id=(select auth.uid()) and status='rejected')
with check (user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null);
