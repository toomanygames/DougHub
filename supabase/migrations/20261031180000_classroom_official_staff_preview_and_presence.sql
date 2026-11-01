create or replace function private.is_classroom_preview_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.is_developer is true
        or p.is_admin is true
        or p.is_owner is true
        or lower(coalesce(p.staff_role, '')) in ('developer', 'admin', 'owner')
      )
  );
$$;

create or replace function private.is_classroom_teacher_online(p_classroom_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classroom_spaces c
    join public.user_presence up on up.user_id = c.teacher_id
    where c.id = p_classroom_id
      and up.last_seen_at > now() - interval '90 seconds'
  );
$$;

revoke all on function private.is_classroom_preview_staff() from public;
revoke all on function private.is_classroom_teacher_online(uuid) from public;
grant execute on function private.is_classroom_preview_staff() to authenticated;
grant execute on function private.is_classroom_teacher_online(uuid) to authenticated;

drop policy if exists "classroom spaces visible to participants and owner" on public.classroom_spaces;
create policy "classroom spaces visible to participants owner and preview staff"
on public.classroom_spaces
for select
to authenticated
using (
  teacher_id = (select auth.uid())
  or private.is_classroom_member(id)
  or private.is_classroom_owner()
  or private.is_classroom_preview_staff()
);

drop policy if exists "class chat visible to approved participants" on public.classroom_chat_messages;
create policy "class chat visible to approved participants and online preview staff"
on public.classroom_chat_messages
for select
to authenticated
using (
  private.is_classroom_teacher(classroom_id)
  or private.is_classroom_member(classroom_id)
  or (
    private.is_classroom_preview_staff()
    and private.is_classroom_teacher_online(classroom_id)
  )
);

drop policy if exists "active class participants can chat" on public.classroom_chat_messages;
create policy "active class participants and online preview staff can chat"
on public.classroom_chat_messages
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.classroom_spaces c
    where c.id = classroom_chat_messages.classroom_id
      and c.session_active is true
      and private.is_classroom_teacher_online(c.id)
      and (
        private.is_classroom_teacher(c.id)
        or private.is_classroom_member(c.id)
        or private.is_classroom_preview_staff()
      )
  )
);

