create or replace function private.resume_due_classroom(p_classroom_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare resumed_count integer;
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.classroom_enrollments e
  where e.classroom_id=p_classroom_id and e.student_id=(select auth.uid()) and e.status='approved'
 ) then return false; end if;
 update public.classroom_spaces set session_active=true,session_resume_at=null,updated_at=now()
 where id=p_classroom_id and session_active=false and session_resume_at is not null and session_resume_at<=now();
 get diagnostics resumed_count=row_count;
 return resumed_count>0;
end;
$$;
revoke all on function private.resume_due_classroom(uuid) from public,anon;
grant execute on function private.resume_due_classroom(uuid) to authenticated;

create or replace function public.resume_due_classroom(p_classroom_id uuid)
returns boolean language sql security invoker set search_path=''
as $$ select private.resume_due_classroom(p_classroom_id); $$;
revoke all on function public.resume_due_classroom(uuid) from public,anon;
grant execute on function public.resume_due_classroom(uuid) to authenticated;
