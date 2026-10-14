-- DougHub community chat groups: public/private groups, membership, and private-message isolation.
create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 300),
  is_public boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.chat_messages add column if not exists group_id uuid references public.chat_groups(id) on delete cascade;
create index if not exists chat_messages_group_created_idx on public.chat_messages(group_id, created_at desc);
create index if not exists chat_group_members_user_idx on public.chat_group_members(user_id, group_id);

create or replace function public.is_douqhub_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin is true);
$$;
revoke all on function public.is_douqhub_admin() from public;
grant execute on function public.is_douqhub_admin() to authenticated;

create or replace function public.can_access_chat_group(target_group_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_douqhub_admin()
    or exists (select 1 from public.chat_groups g where g.id = target_group_id and (g.is_public is true or g.created_by = (select auth.uid())))
    or exists (select 1 from public.chat_group_members m where m.group_id = target_group_id and m.user_id = (select auth.uid()));
$$;
revoke all on function public.can_access_chat_group(uuid) from public;
grant execute on function public.can_access_chat_group(uuid) to authenticated;

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;

drop policy if exists "Chat groups are visible to members and public groups" on public.chat_groups;
create policy "Chat groups are visible to members and public groups" on public.chat_groups
for select to authenticated using (is_public or created_by = (select auth.uid()) or public.can_access_chat_group(id));
drop policy if exists "Signed-in users can create chat groups" on public.chat_groups;
create policy "Signed-in users can create chat groups" on public.chat_groups
for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists "Owners and admins can update chat groups" on public.chat_groups;
create policy "Owners and admins can update chat groups" on public.chat_groups
for update to authenticated using (created_by = (select auth.uid()) or public.is_douqhub_admin())
with check (created_by = (select auth.uid()) or public.is_douqhub_admin());
drop policy if exists "Owners and admins can delete chat groups" on public.chat_groups;
create policy "Owners and admins can delete chat groups" on public.chat_groups
for delete to authenticated using (created_by = (select auth.uid()) or public.is_douqhub_admin());

drop policy if exists "Members can view group membership" on public.chat_group_members;
create policy "Members can view group membership" on public.chat_group_members
for select to authenticated using (public.can_access_chat_group(group_id));
drop policy if exists "Users can join public groups and owners can add members" on public.chat_group_members;
create policy "Users can join public groups and owners can add members" on public.chat_group_members
for insert to authenticated with check (
  (user_id = (select auth.uid()) and exists (select 1 from public.chat_groups g where g.id = group_id and g.is_public))
  or (user_id = (select auth.uid()) and public.is_douqhub_admin())
  or exists (select 1 from public.chat_groups g where g.id = group_id and (g.created_by = (select auth.uid()) or public.is_douqhub_admin()))
);
drop policy if exists "Users can leave groups and owners/admins can remove members" on public.chat_group_members;
create policy "Users can leave groups and owners/admins can remove members" on public.chat_group_members
for delete to authenticated using (
  user_id = (select auth.uid())
  or exists (select 1 from public.chat_groups g where g.id = group_id and (g.created_by = (select auth.uid()) or public.is_douqhub_admin()))
);

drop policy if exists "Anyone can read community chat" on public.chat_messages;
drop policy if exists "Authenticated users can view chat" on public.chat_messages;
create policy "Read public chat and accessible group chat" on public.chat_messages
for select to anon, authenticated using (
  group_id is null or (auth.uid() is not null and public.can_access_chat_group(group_id))
);
drop policy if exists "Authenticated users can send chat messages" on public.chat_messages;
create policy "Authenticated users can send public or group messages" on public.chat_messages
for insert to authenticated with check (
  user_id = (select auth.uid()) and (group_id is null or public.can_access_chat_group(group_id))
);

grant select on public.chat_groups, public.chat_group_members to authenticated;
grant insert, update, delete on public.chat_groups to authenticated;
grant insert, delete on public.chat_group_members to authenticated;
