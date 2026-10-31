create or replace function private.protect_classroom_teacher_verification()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if current_user <> 'service_role' and not coalesce(private.is_classroom_owner(),false) then
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
