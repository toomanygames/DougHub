create table public.classroom_teacher_applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade unique,
 message text not null default '' check (length(message)<=500),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.classroom_teacher_applications enable row level security;
grant select,insert,update on public.classroom_teacher_applications to authenticated;
create policy "teachers see their own application" on public.classroom_teacher_applications
for select to authenticated using (user_id=(select auth.uid()) or private.is_classroom_owner());
create policy "users request teacher verification" on public.classroom_teacher_applications
for insert to authenticated with check (user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null);
create policy "owners review teacher applications" on public.classroom_teacher_applications
for update to authenticated using (private.is_classroom_owner()) with check (private.is_classroom_owner());
create policy "owners manage teacher profile verification" on public.profiles
for update to authenticated using (private.is_classroom_owner()) with check (private.is_classroom_owner());
