-- DougWorld 3D: private cloud saves for characters and builds. Each player can only see and change their own rows.
create table if not exists public.dougworld_saves (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null check (kind in ('character','build')),
 slot text not null check (char_length(slot) between 1 and 40),
 name text not null check (char_length(name) between 1 and 60),
 data jsonb not null check (pg_column_size(data) < 700000),
 updated_at timestamptz not null default now(),
 primary key (user_id,kind,slot)
);
alter table public.dougworld_saves enable row level security;
drop policy if exists "Players read own DougWorld saves" on public.dougworld_saves;
create policy "Players read own DougWorld saves" on public.dougworld_saves for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Players add own DougWorld saves" on public.dougworld_saves;
create policy "Players add own DougWorld saves" on public.dougworld_saves for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Players update own DougWorld saves" on public.dougworld_saves;
create policy "Players update own DougWorld saves" on public.dougworld_saves for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Players delete own DougWorld saves" on public.dougworld_saves;
create policy "Players delete own DougWorld saves" on public.dougworld_saves for delete to authenticated using ((select auth.uid())=user_id);
revoke all on public.dougworld_saves from anon;
grant select,insert,update,delete on public.dougworld_saves to authenticated;

-- Cap each player at 20 saves of each kind so the table cannot be filled up.
create or replace function private.dougworld_save_limit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public.dougworld_saves where user_id=new.user_id and kind=new.kind and slot<>new.slot)>=20 then
  raise exception 'You can keep up to 20 saved %s. Delete one first.', new.kind;
 end if;
 return new;
end $$;
revoke all on function private.dougworld_save_limit() from public,anon,authenticated;
drop trigger if exists dougworld_save_limit on public.dougworld_saves;
create trigger dougworld_save_limit before insert on public.dougworld_saves for each row execute function private.dougworld_save_limit();
