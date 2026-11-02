-- Profile creation runs from the Auth trigger without a caller JWT, so always
-- start new profiles as unverified unless an authenticated Admin+ is creating it.
create or replace function private.dh_protect_chat_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is null or not private.dh_is_chat_approver() then
      new.chat_verified := false;
      new.chat_verified_at := null;
      new.chat_verified_by := null;
    end if;
  elsif (select auth.uid()) is not null and not private.dh_is_chat_approver() then
    new.chat_verified := old.chat_verified;
    new.chat_verified_at := old.chat_verified_at;
    new.chat_verified_by := old.chat_verified_by;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_chat_verification_fields on public.profiles;
create trigger protect_chat_verification_fields
before insert or update on public.profiles
for each row execute function private.dh_protect_chat_verification_fields();
