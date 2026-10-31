alter table public.dh_wallets
  add column if not exists rune_decode_claim_date date;

create or replace function private.dh_claim_rune_decode(p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_day date;
  v_words text[] := array[
    'EMBER','LIGHT','STONE','RIVER','CLOUD',
    'FLAME','NORTH','BRAVE','CROWN','MAGIC',
    'SPARK','QUEST','SHINE','DREAM','PIXEL',
    'CHARM','FROST','GLOBE','PRISM','STARS'
  ];
  v_word text;
  v_index integer;
  v_claim_date date;
  v_balance integer;
  v_reward integer := 20;
begin
  if v_user is null then
    raise exception 'Please sign in to earn credits.';
  end if;

  v_day := (v_now at time zone 'UTC')::date;
  v_index := ((v_day - date '2026-01-01') % array_length(v_words, 1)) + 1;
  v_word := v_words[v_index];

  if upper(trim(coalesce(p_answer, ''))) <> v_word then
    return jsonb_build_object(
      'claimed', false,
      'correct', false,
      'credits_awarded', 0,
      'message', 'That code does not match yet.',
      'server_date', to_char(v_day, 'YYYY-MM-DD')
    );
  end if;

  insert into public.dh_wallets(user_id, credits)
  values (v_user, 0)
  on conflict (user_id) do nothing;

  select credits, rune_decode_claim_date
    into v_balance, v_claim_date
  from public.dh_wallets
  where user_id = v_user
  for update;

  if v_claim_date = v_day then
    return jsonb_build_object(
      'claimed', false,
      'correct', true,
      'already_claimed', true,
      'credits_awarded', 0,
      'message', 'You already collected today’s Rune Decoder reward.',
      'server_date', to_char(v_day, 'YYYY-MM-DD')
    );
  end if;

  update public.dh_wallets
  set credits = credits + v_reward,
      rune_decode_claim_date = v_day,
      updated_at = now()
  where user_id = v_user
  returning credits into v_balance;

  insert into public.dh_credit_transactions(user_id, amount, reason)
  values (v_user, v_reward, 'Daily Rune Decoder completion');

  return jsonb_build_object(
    'claimed', true,
    'correct', true,
    'credits_awarded', v_reward,
    'credits_balance', v_balance,
    'message', 'Rune code solved! 20 credits added.',
    'server_date', to_char(v_day, 'YYYY-MM-DD')
  );
end;
$$;

create or replace function private.dh_get_daily_status()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_next timestamptz;
  v_day date;
  v_claims jsonb := '[]'::jsonb;
  v_user uuid := auth.uid();
begin
  v_day := (v_now at time zone 'UTC')::date;
  v_next := ((date_trunc('day', v_now at time zone 'UTC') + interval '1 day') at time zone 'UTC');

  if v_user is not null then
    select coalesce(jsonb_agg(game_id order by game_id), '[]'::jsonb)
      into v_claims
    from public.dh_daily_claims
    where user_id = v_user and claim_date = v_day;

    if exists (
      select 1
      from public.dh_wallets
      where user_id = v_user and rune_decode_claim_date = v_day
    ) then
      v_claims := v_claims || jsonb_build_array('rune_decode');
    end if;
  end if;

  return jsonb_build_object(
    'server_date', to_char(v_day, 'YYYY-MM-DD'),
    'server_now', v_now,
    'next_reset', v_next,
    'claimed_games', v_claims
  );
end;
$$;
