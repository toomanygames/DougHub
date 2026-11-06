-- The admin panel saves staff ranks through the promote-doughub-staff edge function, which verifies the Owner's
-- password and then updates profiles with the service-role key. That connection has no signed-in user (auth.uid() is null),
-- so the old guard rejected every rank change with "Only a DougHub Owner can verify teacher accounts or change staff permissions."
-- Allow the trusted service role through. Everyone else still needs to be an Owner.
create or replace function private.guard_classroom_teacher_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_classroom_owner() and coalesce(auth.role(), '') <> 'service_role' then
    if new.teacher_verified is distinct from old.teacher_verified
       or new.is_owner is distinct from old.is_owner
       or new.is_admin is distinct from old.is_admin
       or new.is_developer is distinct from old.is_developer
       or new.is_helper is distinct from old.is_helper
       or new.staff_role is distinct from old.staff_role
       or (new.account_type = 'teacher' and old.account_type is distinct from 'teacher') then
      raise exception 'Only a DougHub Owner can verify teacher accounts or change staff permissions.' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;
