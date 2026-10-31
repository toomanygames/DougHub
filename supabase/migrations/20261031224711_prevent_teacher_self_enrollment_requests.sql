drop policy if exists "teachers request enrollment" on public.classroom_enrollments;
create policy "teachers request enrollment" on public.classroom_enrollments
for insert to authenticated
with check (
 requested_by=(select auth.uid())
 and student_id <> (select auth.uid())
 and status='pending'
 and verified_by is null
 and verified_at is null
 and private.is_classroom_teacher(classroom_id)
);
