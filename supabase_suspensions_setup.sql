-- DougHub account suspension support
-- Run this once in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists ban_type text,
  add column if not exists suspended_until timestamptz;

alter table public.profiles
  drop constraint if exists profiles_ban_type_check;

alter table public.profiles
  add constraint profiles_ban_type_check
  check (ban_type is null or ban_type in ('ban','suspend'));

create index if not exists profiles_suspended_until_idx
  on public.profiles (suspended_until);

-- Existing bans remain permanent because their ban_type is NULL.
-- New admin bans use ban_type = 'ban'.
-- Timed suspensions use ban_type = 'suspend' plus suspended_until.
