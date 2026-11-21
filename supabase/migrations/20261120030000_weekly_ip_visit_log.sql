create table if not exists public.ip_visits (
  id bigint generated always as identity primary key,
  ip text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_agent text,
  source text not null default 'app',
  created_at timestamptz not null default now()
);
create index if not exists ip_visits_ip_created_idx on public.ip_visits (ip, created_at desc);
create index if not exists ip_visits_created_idx on public.ip_visits (created_at desc);
alter table public.ip_visits enable row level security;
revoke all on public.ip_visits from anon, authenticated;
grant select, delete on public.ip_visits to authenticated;
create policy "owner reads ip visits" on public.ip_visits for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_owner is true or lower(coalesce(p.staff_role,'')) = 'owner')));
create policy "owner deletes ip visits" on public.ip_visits for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_owner is true or lower(coalesce(p.staff_role,'')) = 'owner')));
