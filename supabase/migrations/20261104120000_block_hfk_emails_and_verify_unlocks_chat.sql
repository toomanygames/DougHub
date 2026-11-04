-- 1. No DougHub account may use an email address containing "hfk" (for example @hfkschool.org).
--    Enforced on the auth table itself, so it covers sign-up, email changes and every client.
create or replace function private.dh_block_hfk_emails()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and position('hfk' in lower(new.email)) > 0 then
    raise exception 'This email address can''t be used for a DougHub account.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function private.dh_block_hfk_emails() from public, anon, authenticated;
drop trigger if exists dh_block_hfk_emails on auth.users;
create trigger dh_block_hfk_emails
  before insert or update of email on auth.users
  for each row execute function private.dh_block_hfk_emails();

-- 2. Verifying your email unlocks chat. Only a real verification counts (a confirmation email was sent),
--    so auto-confirmed accounts still need a staff member to tick them. Staff can still take chat away later.
create or replace function private.dh_chat_on_email_verified()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null and new.confirmation_sent_at is not null then
    insert into public.chat_access_approvals(user_id, approved_by, approved_at)
    values (new.id, new.id, now())
    on conflict (user_id) do nothing;
    delete from public.chat_access_requests where user_id = new.id;
  end if;
  return new;
end $$;
revoke all on function private.dh_chat_on_email_verified() from public, anon, authenticated;
drop trigger if exists dh_chat_on_email_verified on auth.users;
create trigger dh_chat_on_email_verified
  after update of email_confirmed_at on auth.users
  for each row execute function private.dh_chat_on_email_verified();
