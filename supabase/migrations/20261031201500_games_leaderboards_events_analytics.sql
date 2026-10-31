-- This migration was applied to the connected DougHub Supabase project.
-- Creates private player stats and event score tables, a safe public leaderboard
-- snapshot, and an authenticated RPC that records one Wordle result per UTC day.
create table if not exists public.dh_game_stats (
 user_id uuid primary key references auth.users(id) on delete cascade,
 games_completed integer not null default 0, games_solved integer not null default 0,
 total_attempts integer not null default 0, current_streak integer not null default 0,
 longest_streak integer not null default 0, last_play_date date, updated_at timestamptz not null default now()
);
create table if not exists public.dh_event_scores (
 user_id uuid not null references auth.users(id) on delete cascade, event_key text not null,
 points integer not null default 0, games_played integer not null default 0,
 solves integer not null default 0, updated_at timestamptz not null default now(),
 primary key(user_id,event_key)
);
create table if not exists public.dh_event_rewards (
 user_id uuid not null references auth.users(id) on delete cascade, event_key text not null,
 reward_id text not null, awarded_at timestamptz not null default now(),
 primary key(user_id,event_key,reward_id)
);
create table if not exists public.dh_leaderboard_public (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null, avatar_url text, all_time_points integer not null default 0,
 monthly_points integer not null default 0, month_key text not null,
 games_completed integer not null default 0, games_solved integer not null default 0,
 current_streak integer not null default 0, longest_streak integer not null default 0,
 average_attempts numeric(4,2) not null default 0, updated_at timestamptz not null default now()
);
create index if not exists dh_leaderboard_monthly_idx on public.dh_leaderboard_public(monthly_points desc,all_time_points desc);
create index if not exists dh_leaderboard_alltime_idx on public.dh_leaderboard_public(all_time_points desc);
alter table public.dh_game_stats enable row level security;
alter table public.dh_event_scores enable row level security;
alter table public.dh_event_rewards enable row level security;
alter table public.dh_leaderboard_public enable row level security;
drop policy if exists "Users read own game stats" on public.dh_game_stats;
create policy "Users read own game stats" on public.dh_game_stats for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Users read own event scores" on public.dh_event_scores;
create policy "Users read own event scores" on public.dh_event_scores for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Users read own event rewards" on public.dh_event_rewards;
create policy "Users read own event rewards" on public.dh_event_rewards for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Leaderboard is public" on public.dh_leaderboard_public;
create policy "Leaderboard is public" on public.dh_leaderboard_public for select to anon,authenticated using(true);
grant select on public.dh_game_stats,public.dh_event_scores,public.dh_event_rewards to authenticated;
grant select on public.dh_leaderboard_public to anon,authenticated;
revoke insert,update,delete on public.dh_game_stats,public.dh_event_scores,public.dh_event_rewards,public.dh_leaderboard_public from anon,authenticated;
create or replace function private.dh_submit_wordle_result(p_solved boolean,p_attempts integer)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid();v_day date:=(now() at time zone 'utc')::date;
 v_month text:=to_char((now() at time zone 'utc')::date,'YYYY-MM');v_reward integer:=25;
 v_points integer;v_streak integer;v_longest integer;v_games integer;v_month_games integer;
 v_bonus integer:=0;v_inserted integer;v_username text;v_avatar text;
begin
 if v_user is null then raise exception 'Please sign in to submit a result.';end if;
 if p_attempts<1 or p_attempts>6 then raise exception 'Invalid Wordle attempt count.';end if;
 insert into public.dh_daily_claims(user_id,game_id,claim_date,credits_awarded) values(v_user,'wordle',v_day,v_reward)
 on conflict(user_id,game_id,claim_date) do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then return jsonb_build_object('recorded',false,'message','Today''s Wordle result has already been recorded.');end if;
 insert into public.dh_wallets(user_id,credits) values(v_user,0) on conflict(user_id) do nothing;
 update public.dh_wallets set credits=credits+v_reward,updated_at=now() where user_id=v_user;
 insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,v_reward,'Daily Wordle completion');
 select coalesce(current_streak,0),coalesce(longest_streak,0) into v_streak,v_longest from public.dh_game_stats where user_id=v_user;
 if not found then v_streak:=0;v_longest:=0;end if;
 if exists(select 1 from public.dh_game_stats where user_id=v_user and last_play_date=v_day-1) then v_streak:=v_streak+1;else v_streak:=1;end if;
 v_longest:=greatest(v_longest,v_streak);
 v_points:=case when p_solved then greatest(30,100-(p_attempts-1)*12) else 5 end;
 insert into public.dh_game_stats(user_id,games_completed,games_solved,total_attempts,current_streak,longest_streak,last_play_date,updated_at)
 values(v_user,1,case when p_solved then 1 else 0 end,p_attempts,v_streak,v_longest,v_day,now())
 on conflict(user_id) do update set games_completed=dh_game_stats.games_completed+1,
 games_solved=dh_game_stats.games_solved+case when p_solved then 1 else 0 end,
 total_attempts=dh_game_stats.total_attempts+excluded.total_attempts,
 current_streak=excluded.current_streak,longest_streak=greatest(dh_game_stats.longest_streak,excluded.longest_streak),
 last_play_date=excluded.last_play_date,updated_at=now();
 insert into public.dh_event_scores(user_id,event_key,points,games_played,solves,updated_at)
 values(v_user,v_month,v_points,1,case when p_solved then 1 else 0 end,now())
 on conflict(user_id,event_key) do update set points=dh_event_scores.points+excluded.points,
 games_played=dh_event_scores.games_played+1,solves=dh_event_scores.solves+excluded.solves,updated_at=now();
 select games_played into v_month_games from public.dh_event_scores where user_id=v_user and event_key=v_month;
 if v_month_games>=5 then
  insert into public.dh_event_rewards(user_id,event_key,reward_id) values(v_user,v_month,'monthly_puzzle_rally') on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=1 then
   v_bonus:=75;update public.dh_wallets set credits=credits+v_bonus,updated_at=now() where user_id=v_user;
   insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,v_bonus,'Monthly Puzzle Rally reward');
   update public.profiles set reward_badges=array(select distinct unnest(coalesce(reward_badges,'{}'::text[])||'badge_monthly_puzzle_rally')) where id=v_user;
  end if;
 end if;
 select username,avatar_url into v_username,v_avatar from public.profiles where id=v_user;
 insert into public.dh_leaderboard_public(user_id,username,avatar_url,all_time_points,monthly_points,month_key,games_completed,games_solved,current_streak,longest_streak,average_attempts,updated_at)
 select v_user,coalesce(v_username,'Player'),v_avatar,v_points,v_points,v_month,s.games_completed,s.games_solved,s.current_streak,s.longest_streak,
 case when s.games_completed>0 then round(s.total_attempts::numeric/s.games_completed,2) else 0 end,now()
 from public.dh_game_stats s where s.user_id=v_user
 on conflict(user_id) do update set username=excluded.username,avatar_url=excluded.avatar_url,
 all_time_points=dh_leaderboard_public.all_time_points+excluded.all_time_points,
 monthly_points=case when dh_leaderboard_public.month_key=excluded.month_key then dh_leaderboard_public.monthly_points+excluded.monthly_points else excluded.monthly_points end,
 month_key=excluded.month_key,games_completed=excluded.games_completed,games_solved=excluded.games_solved,
 current_streak=excluded.current_streak,longest_streak=excluded.longest_streak,average_attempts=excluded.average_attempts,updated_at=now();
 select games_completed into v_games from public.dh_game_stats where user_id=v_user;
 return jsonb_build_object('recorded',true,'credits_awarded',v_reward,'event_bonus',v_bonus,'points_awarded',v_points,
 'games_completed',v_games,'current_streak',v_streak,'monthly_games',v_month_games,'event_badge_unlocked',v_bonus>0,
 'message',case when v_bonus>0 then 'Result saved! +25 credits and the Monthly Puzzle Rally reward (+75 credits and an exclusive badge).' else 'Result saved! +25 credits added.' end);
end $$;
revoke all on function private.dh_submit_wordle_result(boolean,integer) from public;
grant execute on function private.dh_submit_wordle_result(boolean,integer) to authenticated;
create or replace function public.dh_submit_wordle_result(p_solved boolean,p_attempts integer)
returns jsonb language sql security invoker set search_path=public,private as $$ select private.dh_submit_wordle_result(p_solved,p_attempts) $$;
revoke all on function public.dh_submit_wordle_result(boolean,integer) from public,anon;
grant execute on function public.dh_submit_wordle_result(boolean,integer) to authenticated;
revoke all on function public.dh_claim_daily_game(text) from public,anon,authenticated;
revoke all on function private.dh_claim_daily_game(text) from public,anon,authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dh_leaderboard_public') then
  alter publication supabase_realtime add table public.dh_leaderboard_public;
 end if;
end $$;
