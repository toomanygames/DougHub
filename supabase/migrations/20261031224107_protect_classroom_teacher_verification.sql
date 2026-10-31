create or replace function private.protect_classroom_teacher_verification()
returns trigger language plpgsql security definer set search_path=''
as $$
declare owner_id uuid := 'f145067b-724c-40aa-9ab1-60ddaa351d27'::uuid;
begin
 if current_user <> 'service_role' and (select auth.uid()) is distinct from owner_id then
  if tg_op='INSERT' then
   if new.account_type='teacher' or coalesce(new.teacher_verified,false) then
    raise exception 'Only the DougHub Owner can verify teacher accounts';
   end if;
  elsif new.account_type is distinct from old.account_type
     or new.teacher_verified is distinct from old.teacher_verified then
   raise exception 'Only the DougHub Owner can change teacher verification';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists protect_classroom_teacher_verification on public.profiles;
create trigger protect_classroom_teacher_verification
before insert or update on public.profiles
for each row execute function private.protect_classroom_teacher_verification();
