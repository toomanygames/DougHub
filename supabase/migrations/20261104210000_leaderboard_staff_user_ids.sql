-- Staff (Admin and above) get each row's user id on the leaderboard so a suspicious score can be removed.
-- Regular members never receive user ids.
create or replace function public.dh_game_leaderboard(p_game text, p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_game public.dh_games%rowtype;
  v_rows jsonb;
  v_me jsonb;
  v_staff boolean := private.dh_staff_rank() >= 2;
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
      'is_me', s.user_id = v_user,
      'user_id', case when v_staff then s.user_id end) as r
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
