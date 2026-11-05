-- Staff announcements: a clearly labeled kind of chat message that only Admin, Developer and Owner can post.
-- The message always carries the real poster's account (user_id / username), so reports and the audit log stay
-- accurate. It is never a way to post as someone else.
alter table public.chat_messages
  add column if not exists kind text not null default 'message';
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('message', 'announcement'));

create or replace function private.dh_guard_chat_announcements()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'announcement' then
    if (tg_op = 'INSERT' or old.kind is distinct from 'announcement') then
      if (select auth.uid()) is null or private.dh_staff_rank() < 2 then
        raise exception 'Only Admin or higher staff can post staff announcements.';
      end if;
      if tg_op = 'INSERT' and new.user_id is distinct from (select auth.uid()) then
        raise exception 'Staff announcements are always posted as yourself.';
      end if;
      perform private.dh_audit('chat', 'Posted a staff announcement', new.user_id, true,
        jsonb_build_object('group_id', new.group_id));
    end if;
  end if;
  return new;
end $$;
revoke all on function private.dh_guard_chat_announcements() from public, anon, authenticated;

drop trigger if exists dh_guard_chat_announcements on public.chat_messages;
create trigger dh_guard_chat_announcements before insert or update of kind on public.chat_messages
  for each row execute function private.dh_guard_chat_announcements();
