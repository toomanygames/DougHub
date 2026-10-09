-- DougHub XP, achievements, and daily challenge foundation
create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.daily_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null,
  challenge_id text not null check (challenge_id in ('daily_checkin','play_game','create_game')),
  xp_awarded integer not null check (xp_awarded > 0),
  completed_at timestamptz not null default now(),
  unique (user_id, challenge_date, challenge_id)
);
alter table public.player_progress enable row level security;
alter table public.daily_challenge_completions enable row level security;
drop policy if exists "Users can read their own progress" on public.player_progress;
create policy "Users can read their own progress" on public.player_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can read their own challenge completions" on public.daily_challenge_completions;
create policy "Users can read their own challenge completions" on public.daily_challenge_completions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.player_progress from anon, authenticated;
grant select on public.player_progress to authenticated;
revoke all on public.daily_challenge_completions from anon, authenticated;
grant select on public.daily_challenge_completions to authenticated;
create or replace function public.claim_daily_challenge(p_challenge_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_xp integer;
  v_total integer;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'You must be signed in to claim challenges.'; end if;
  if p_challenge_id not in ('daily_checkin','play_game','create_game') then raise exception 'Unknown challenge.'; end if;
  if p_challenge_id = 'play_game' and not exists (
    select 1 from public.game_play_sessions s where s.user_id = v_user_id
      and s.started_at >= (v_today::timestamp at time zone 'utc')
      and s.started_at < ((v_today + 1)::timestamp at time zone 'utc')
  ) then raise exception 'Play a community game first, then return to claim this reward.'; end if;
  if p_challenge_id = 'create_game' and not exists (
    select 1 from public.community_games g where g.creator_id = v_user_id
      and g.created_at >= (v_today::timestamp at time zone 'utc')
      and g.created_at < ((v_today + 1)::timestamp at time zone 'utc')
  ) then raise exception 'Publish a mini game first, then return to claim this reward.'; end if;
  v_xp := case p_challenge_id when 'daily_checkin' then 20 when 'play_game' then 15 when 'create_game' then 50 end;
  insert into public.daily_challenge_completions(user_id, challenge_date, challenge_id, xp_awarded)
  values (v_user_id, v_today, p_challenge_id, v_xp)
  on conflict (user_id, challenge_date, challenge_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select xp into v_total from public.player_progress where user_id = v_user_id;
    return jsonb_build_object('ok', false, 'already_claimed', true, 'xp', 0, 'total_xp', coalesce(v_total, 0));
  end if;
  insert into public.player_progress(user_id, xp, updated_at) values (v_user_id, v_xp, now())
  on conflict (user_id) do update set xp = public.player_progress.xp + excluded.xp, updated_at = now()
  returning xp into v_total;
  return jsonb_build_object('ok', true, 'already_claimed', false, 'xp', v_xp, 'total_xp', v_total);
end; $$;
revoke all on function public.claim_daily_challenge(text) from public, anon;
grant execute on function public.claim_daily_challenge(text) to authenticated;
