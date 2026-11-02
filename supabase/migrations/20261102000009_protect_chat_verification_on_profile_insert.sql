-- Prevent users from setting chat approval during profile creation or update.
create or replace function public.dh_protect_chat_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_admin_or_higher() then
    if tg_op = 'INSERT' then
      new.chat_verified := false;
      new.chat_verified_at := null;
      new.chat_verified_by := null;
    else
      new.chat_verified := old.chat_verified;
      new.chat_verified_at := old.chat_verified_at;
      new.chat_verified_by := old.chat_verified_by;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_chat_verification_fields on public.profiles;
create trigger protect_chat_verification_fields
before insert or update on public.profiles
for each row
execute function public.dh_protect_chat_verification_fields();
