create schema if not exists private;

create table if not exists public.deleted_items (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_row jsonb not null,
  item_label text not null default 'Deleted item',
  deleted_by uuid null,
  deleted_at timestamptz not null default now()
);

alter table public.deleted_items enable row level security;
revoke all on public.deleted_items from anon, authenticated;
grant select, delete on public.deleted_items to authenticated;

drop policy if exists "Owner can review deleted items" on public.deleted_items;
create policy "Owner can review deleted items"
on public.deleted_items for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.staff_role = 'owner' or p.is_owner = true)
  )
);

drop policy if exists "Owner can permanently delete archived items" on public.deleted_items;
create policy "Owner can permanently delete archived items"
on public.deleted_items for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.staff_role = 'owner' or p.is_owner = true)
  )
);

create or replace function private.archive_deleted_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  label text;
  actor uuid;
begin
  actor := auth.uid();
  label := coalesce(
    nullif(to_jsonb(old)->>'title',''),
    nullif(to_jsonb(old)->>'name',''),
    nullif(to_jsonb(old)->>'username',''),
    nullif(to_jsonb(old)->>'message',''),
    nullif(to_jsonb(old)->>'body',''),
    nullif(to_jsonb(old)->>'comment',''),
    nullif(to_jsonb(old)->>'description',''),
    nullif(to_jsonb(old)->>'path',''),
    nullif(to_jsonb(old)->>'file_name',''),
    nullif(to_jsonb(old)->>'email',''),
    'Deleted item'
  );
  insert into public.deleted_items(source_table, source_row, item_label, deleted_by)
  values (tg_table_name, to_jsonb(old), left(label, 240), actor);
  return old;
end;
$$;

revoke all on function private.archive_deleted_row() from public, anon, authenticated;

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname <> 'deleted_items'
      and c.relname not in (
        'user_presence',
        'game_play_sessions',
        'game_trending_events',
        'titlebound_title_counts',
        'titlebound_unlocks',
        'chat_retention_settings'
      )
  loop
    execute format('drop trigger if exists archive_deleted_row on public.%I', t.relname);
    execute format(
      'create trigger archive_deleted_row after delete on public.%I for each row execute function private.archive_deleted_row()',
      t.relname
    );
  end loop;
end;
$$;
