-- Showcase (public character profiles), badge -> character rewards, and per-game leaderboards.
-- Characters already grant their own badge when collected. This migration adds:
--   1. Public showcase: members choose a featured character and whether their collection is public.
--   2. Badge rewards: earning certain badges grants a character.
--   3. Leaderboards: validated best-score tables for chosen games, plus a Collectors board.
-- All reads go through SECURITY DEFINER functions that return only public-safe fields
-- (username, avatar, characters, badges, scores). Raw inventory/loadout tables stay private.

-- ============================================================ 1. Showcase
alter table public.profiles add column if not exists showcase_public boolean not null default true;
alter table public.profiles add column if not exists featured_character_id text;

create or replace function private.dh_rarity_points(p_rarity text)
returns integer language sql immutable set search_path = '' as $$
  select case p_rarity when 'common' then 1 when 'uncommon' then 2 when 'rare' then 4 when 'epic' then 8 when 'legendary' then 16 else 1 end
$$;

-- The character shown for a member: their pick, else their saved look, else their rarest character.
create or replace function private.dh_featured_character(p_user uuid)
returns text language sql stable security definer set search_path = '' as $
  select coalesce(
    (select i.character_id from public.dh_character_inventory i
       join public.profiles p on p.id = i.user_id and p.featured_character_id = i.character_id where i.user_id = p_user limit 1),
    (select l.character_id from public.dh_character_loadouts l where l.user_id = p_user order by l.updated_at desc limit 1),
    (select i.character_id from public.dh_character_inventory i join public.dh_characters c on c.id = i.character_id
       where i.user_id = p_user order by private.dh_rarity_points(c.rarity) desc, i.acquired_at limit 1))
$;
revoke all on function private.dh_featured_character(uuid) from public, anon, authenticated;

create or replace function public.dh_set_showcase(p_character_id text, p_public boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_character_id is not null and not exists (
    select 1 from public.dh_character_inventory i where i.user_id = v_user and i.character_id = p_character_id
  ) then
    raise exception 'You can only feature a character you own.';
  end if;
  update public.profiles
     set featured_character_id = p_character_id,
         showcase_public = coalesce(p_public, showcase_public)
   where id = v_user;
  return jsonb_build_object('featured_character_id', p_character_id, 'showcase_public', coalesce(p_public, true));
end $$;
revoke all on function public.dh_set_showcase(text, boolean) from public, anon;
grant execute on function public.dh_set_showcase(text, boolean) to authenticated;

-- ============================================================ 2. Leaderboards (tables first: the showcase reads them)
create table if not exists public.dh_games (
  game_key text primary key,
  title text not null,
  sort_dir text not null default 'high' check (sort_dir in ('high', 'low')),
  max_score numeric not null,
  unit text not null default 'points',
  active boolean not null default true
);
alter table public.dh_games enable row level security;
drop policy if exists "Signed-in members read the game list" on public.dh_games;
create policy "Signed-in members read the game list" on public.dh_games for select to authenticated using (true);

insert into public.dh_games (game_key, title, sort_dir, max_score, unit) values
  ('starfall-run',    'Starfall Run',    'high', 1000000,   'points'),
  ('crystal-breaker', 'Crystal Breaker', 'high', 1000000,   'points'),
  ('bubble-grove',    'Bubble Grove',    'high', 10000000,  'points'),
  ('puzzle-2048',     'Doug Puzzle 2048','high', 4000000,   'points'),
  ('farm-idle',       'Farm Idle',       'high', 1e30,      'coins earned'),
  ('sparkroot',       'Sparkroot',       'high', 1e30,      'sparks earned')
on conflict (game_key) do nothing;

create table if not exists public.dh_game_scores (
  game_key text not null references public.dh_games(game_key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric not null,
  updated_at timestamptz not null default now(),
  primary key (game_key, user_id)
);
alter table public.dh_game_scores enable row level security;
-- No policies on purpose: members never touch this table directly. Reads and writes go through the functions below.
revoke all on public.dh_game_scores from anon, authenticated;
create index if not exists dh_game_scores_rank_idx on public.dh_game_scores (game_key, score desc);

create or replace function private.dh_score_rank(p_game text, p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select 1 + count(*)::integer
    from public.dh_game_scores s
    join public.dh_games g on g.game_key = s.game_key
    join public.dh_game_scores me on me.game_key = s.game_key and me.user_id = p_user
    join public.profiles p on p.id = s.user_id and not coalesce(p.is_banned, false)
   where s.game_key = p_game
     and ((g.sort_dir = 'high' and s.score > me.score) or (g.sort_dir = 'low' and s.score < me.score))
$$;
revoke all on function private.dh_score_rank(text, uuid) from public, anon, authenticated;

create or replace function public.dh_submit_score(p_game text, p_score numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_game public.dh_games%rowtype;
  v_old public.dh_game_scores%rowtype;
  v_improved boolean := false;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'reason', 'signed_out'); end if;
  if exists (select 1 from public.profiles p where p.id = v_user and coalesce(p.is_banned, false)) then
    return jsonb_build_object('ok', false, 'reason', 'banned');
  end if;
  select * into v_game from public.dh_games where game_key = p_game and active;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_game'); end if;
  if p_score is null or p_score <= 0 or p_score > v_game.max_score then
    return jsonb_build_object('ok', false, 'reason', 'out_of_range');
  end if;
  select * into v_old from public.dh_game_scores where game_key = p_game and user_id = v_user;
  if found then
    -- At most one accepted update every 3 seconds per game.
    if v_old.updated_at > now() - interval '3 seconds' then
      return jsonb_build_object('ok', true, 'improved', false, 'best', v_old.score, 'rank', private.dh_score_rank(p_game, v_user));
    end if;
    if (v_game.sort_dir = 'high' and p_score > v_old.score) or (v_game.sort_dir = 'low' and p_score < v_old.score) then
      update public.dh_game_scores set score = p_score, updated_at = now() where game_key = p_game and user_id = v_user;
      v_improved := true;
    end if;
  else
    insert into public.dh_game_scores (game_key, user_id, score) values (p_game, v_user, p_score);
    v_improved := true;
  end if;
  return jsonb_build_object('ok', true, 'improved', v_improved,
    'best', (select score from public.dh_game_scores where game_key = p_game and user_id = v_user),
    'rank', private.dh_score_rank(p_game, v_user));
end $$;
revoke all on function public.dh_submit_score(text, numeric) from public, anon;
grant execute on function public.dh_submit_score(text, numeric) to authenticated;

create or replace function public.dh_game_leaderboard(p_game text, p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_game public.dh_games%rowtype;
  v_rows jsonb;
  v_me jsonb;
begin
  if v_user is null then raise exception 'Please sign in to see leaderboards.'; end if;
  select * into v_game from public.dh_games where game_key = p_game and active;
  if not found then raise exception 'Unknown game.'; end if;
  select coalesce(jsonb_agg(r order by (r->>'rank')::int), '[]'::jsonb) into v_rows from (
    select jsonb_build_object(
      'rank', row_number() over (order by case when v_game.sort_dir = 'high' then -s.score else s.score end, s.updated_at),
      'username', p.username, 'avatar_url', p.avatar_url, 'score', s.score,
      'art_path', case when p.showcase_public then c.art_path end,
      'finish', case when p.showcase_public then i.finish end,
      'is_me', s.user_id = v_user) as r
    from public.dh_game_scores s
    join public.profiles p on p.id = s.user_id and not coalesce(p.is_banned, false)
    left join public.dh_characters c on c.id = private.dh_featured_character(s.user_id)
    left join public.dh_character_inventory i on i.user_id = s.user_id and i.character_id = c.id
    where s.game_key = p_game
    order by case when v_game.sort_dir = 'high' then -s.score else s.score end, s.updated_at
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  ) q;
  select jsonb_build_object('score', s.score, 'rank', private.dh_score_rank(p_game, v_user))
    into v_me from public.dh_game_scores s where s.game_key = p_game and s.user_id = v_user;
  return jsonb_build_object('game', to_jsonb(v_game), 'rows', v_rows, 'me', v_me,
    'players', (select count(*) from public.dh_game_scores where game_key = p_game));
end $$;
revoke all on function public.dh_game_leaderboard(text, integer) from public, anon;
grant execute on function public.dh_game_leaderboard(text, integer) to authenticated;

create or replace function public.dh_game_list()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('game_key', g.game_key, 'title', g.title, 'sort_dir', g.sort_dir, 'unit', g.unit,
    'players', (select count(*) from public.dh_game_scores s where s.game_key = g.game_key)) order by g.title), '[]'::jsonb)
  from public.dh_games g where g.active and (select auth.uid()) is not null
$$;
revoke all on function public.dh_game_list() from public, anon;
grant execute on function public.dh_game_list() to authenticated;

-- Admin+ can remove a suspicious score. It is written to the audit log.
create or replace function public.dh_remove_score(p_game text, p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.dh_staff_rank() < 2 then
    raise exception 'Only Admin or higher staff can remove scores.';
  end if;
  delete from public.dh_game_scores where game_key = p_game and user_id = p_user;
  perform private.dh_audit('leaderboard', 'Removed a leaderboard score', p_user, true, jsonb_build_object('game', p_game));
  return found;
end $$;
revoke all on function public.dh_remove_score(text, uuid) from public, anon;
grant execute on function public.dh_remove_score(text, uuid) to authenticated;

-- ============================================================ 3. Public showcase + collectors board
create or replace function public.dh_public_showcase(p_username text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_viewer uuid := (select auth.uid());
  v_p public.profiles%rowtype;
  v_feat text;
  v_loadout public.dh_character_loadouts%rowtype;
  v_char public.dh_characters%rowtype;
  v_finish text;
begin
  if v_viewer is null then raise exception 'Please sign in to view showcases.'; end if;
  select * into v_p from public.profiles where lower(username) = lower(p_username) and not coalesce(is_banned, false);
  if not found then return jsonb_build_object('found', false); end if;
  if not v_p.showcase_public and v_p.id <> v_viewer and private.dh_staff_rank() < 1 then
    return jsonb_build_object('found', true, 'private', true, 'username', v_p.username, 'avatar_url', v_p.avatar_url);
  end if;

  v_feat := private.dh_featured_character(v_p.id);
  if v_feat is not null then
    select * into v_char from public.dh_characters where id = v_feat;
    select * into v_loadout from public.dh_character_loadouts where user_id = v_p.id and character_id = v_feat;
    select coalesce(v_loadout.finish, i.finish, 'normal') into v_finish
      from public.dh_character_inventory i where i.user_id = v_p.id and i.character_id = v_feat limit 1;
  end if;

  return jsonb_build_object(
    'found', true, 'private', false, 'is_self', v_p.id = v_viewer,
    'username', v_p.username, 'avatar_url', v_p.avatar_url, 'showcase_public', v_p.showcase_public,
    'featured_character_id', v_p.featured_character_id,
    'featured', case when v_feat is null then null else jsonb_build_object(
      'character_id', v_char.id, 'name', v_char.name, 'rarity', v_char.rarity, 'art_path', v_char.art_path, 'finish', coalesce(v_finish, 'normal'),
      'cosmetics', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'category', k.category, 'art_key', k.art_key, 'art_url', k.art_url, 'name', k.name))
                               from public.dh_cosmetics k where k.id = any(coalesce(v_loadout.cosmetic_ids, '{}'::text[]))), '[]'::jsonb)) end,
    'characters', coalesce((select jsonb_agg(jsonb_build_object('character_id', c.id, 'name', c.name, 'rarity', c.rarity, 'pack_type', c.pack_type,
                   'art_path', c.art_path, 'finish', i.finish, 'source', i.source) order by private.dh_rarity_points(c.rarity) desc, c.name)
                   from public.dh_character_inventory i join public.dh_characters c on c.id = i.character_id where i.user_id = v_p.id), '[]'::jsonb),
    'badges', coalesce(to_jsonb(v_p.reward_badges), '[]'::jsonb),
    'equipped_badge', v_p.equipped_badge,
    'custom_badges', coalesce((select jsonb_agg(jsonb_build_object('name', b.name, 'icon', b.icon, 'description', b.description))
                                from public.custom_badges b where b.assigned_to = v_p.id), '[]'::jsonb),
    'stats', jsonb_build_object(
      'owned', (select count(*) from public.dh_character_inventory i where i.user_id = v_p.id),
      'total', (select count(*) from public.dh_characters),
      'points', coalesce((select sum(private.dh_rarity_points(c.rarity)) from public.dh_character_inventory i join public.dh_characters c on c.id = i.character_id where i.user_id = v_p.id), 0)),
    'scores', coalesce((select jsonb_agg(jsonb_build_object('game_key', g.game_key, 'title', g.title, 'score', s.score, 'unit', g.unit,
                   'rank', private.dh_score_rank(g.game_key, v_p.id)) order by g.title)
                   from public.dh_game_scores s join public.dh_games g on g.game_key = s.game_key where s.user_id = v_p.id and g.active), '[]'::jsonb)
  );
end $$;
revoke all on function public.dh_public_showcase(text) from public, anon;
grant execute on function public.dh_public_showcase(text) to authenticated;

create or replace function public.dh_collectors(p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Please sign in to see the collectors board.'; end if;
  return coalesce((select jsonb_agg(q order by (q->>'rank')::int) from (
    select jsonb_build_object(
      'rank', row_number() over (order by t.points desc, t.owned desc, t.username),
      'username', t.username, 'avatar_url', t.avatar_url, 'owned', t.owned, 'points', t.points, 'badges', t.badges,
      'art_path', t.art_path, 'finish', t.finish, 'is_me', t.id = (select auth.uid())) as q
    from (
      select p.id, p.username, p.avatar_url, count(i.id) as owned,
             sum(private.dh_rarity_points(c.rarity)) as points,
             coalesce(cardinality(p.reward_badges), 0) as badges,
             fc.art_path, fi.finish
        from public.profiles p
        join public.dh_character_inventory i on i.user_id = p.id
        join public.dh_characters c on c.id = i.character_id
        left join public.dh_characters fc on fc.id = private.dh_featured_character(p.id)
        left join public.dh_character_inventory fi on fi.user_id = p.id and fi.character_id = fc.id
       where p.showcase_public and not coalesce(p.is_banned, false)
       group by p.id, p.username, p.avatar_url, p.reward_badges, fc.art_path, fi.finish
    ) t
    order by t.points desc, t.owned desc, t.username
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  ) z), '[]'::jsonb);
end $$;
revoke all on function public.dh_collectors(integer) from public, anon;
grant execute on function public.dh_collectors(integer) to authenticated;

-- ============================================================ 4. Badges that grant characters
create table if not exists public.dh_badge_character_rewards (
  badge_id text primary key,
  character_id text not null references public.dh_characters(id) on delete cascade
);
alter table public.dh_badge_character_rewards enable row level security;
drop policy if exists "Signed-in members read badge rewards" on public.dh_badge_character_rewards;
create policy "Signed-in members read badge rewards" on public.dh_badge_character_rewards for select to authenticated using (true);

-- Seasonal badges give the otherwise reward-only Space and Halloween characters.
insert into public.dh_badge_character_rewards (badge_id, character_id) values
  ('summer',    'space_pilot_beige'),
  ('spring',    'space_pilot_yellow'),
  ('fall',      'spooky_pumpkin_bear'),
  ('winter',    'spooky_witch_frog'),
  ('halloween', 'spooky_ghost_rabbit'),
  ('christmas', 'space_pilot_pink'),
  ('og',        'space_pilot_blue')
on conflict (badge_id) do nothing;

create or replace function private.dh_grant_badge_characters(p_user uuid, p_badges text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; v_count integer := 0;
begin
  for r in
    select br.character_id, c.badge_id as char_badge, c.total_supply
      from public.dh_badge_character_rewards br
      join public.dh_characters c on c.id = br.character_id
     where br.badge_id = any(p_badges)
  loop
    if exists (select 1 from public.dh_character_inventory where user_id = p_user and character_id = r.character_id) then continue; end if;
    if (select count(*) from public.dh_character_inventory where character_id = r.character_id) >= r.total_supply then continue; end if;
    insert into public.dh_character_inventory (user_id, character_id, source) values (p_user, r.character_id, 'badge');
    update public.profiles
       set reward_badges = array(select distinct x from unnest(coalesce(reward_badges, '{}'::text[]) || r.char_badge) x)
     where id = p_user;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function private.dh_grant_badge_characters(uuid, text[]) from public, anon, authenticated;

create or replace function private.dh_profile_badge_characters()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_new text[];
begin
  select coalesce(array_agg(x), '{}') into v_new
    from unnest(coalesce(new.reward_badges, '{}'::text[])) x
   where not (x = any(coalesce(old.reward_badges, '{}'::text[])));
  if cardinality(v_new) > 0 then perform private.dh_grant_badge_characters(new.id, v_new); end if;
  return null;
end $$;
revoke all on function private.dh_profile_badge_characters() from public, anon, authenticated;

drop trigger if exists dh_badge_characters on public.profiles;
create trigger dh_badge_characters after update of reward_badges on public.profiles
  for each row when (new.reward_badges is distinct from old.reward_badges)
  execute function private.dh_profile_badge_characters();

-- Members can re-check their own badges (for example after more supply opens up).
create or replace function public.dh_claim_badge_characters()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_badges text[];
begin
  if v_user is null then return 0; end if;
  select coalesce(reward_badges, '{}'::text[]) into v_badges from public.profiles where id = v_user;
  return private.dh_grant_badge_characters(v_user, v_badges);
end $$;
revoke all on function public.dh_claim_badge_characters() from public, anon;
grant execute on function public.dh_claim_badge_characters() to authenticated;

-- Give existing badge holders the characters they already earned.
do $$
declare r record;
begin
  for r in select id, reward_badges from public.profiles where coalesce(cardinality(reward_badges), 0) > 0 loop
    perform private.dh_grant_badge_characters(r.id, r.reward_badges);
  end loop;
end $$;
