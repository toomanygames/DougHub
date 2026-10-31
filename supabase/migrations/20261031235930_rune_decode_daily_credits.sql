-- Daily rune decoding reward. The claim date and reward are verified by Postgres
-- using the same UTC midnight boundary returned by dh_get_daily_status().
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
  v_inserted integer;
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

  insert into public.dh_daily_claims(user_id, game_id, claim_date, credits_awarded)
  values (v_user, 'rune_decode', v_day, v_reward)
  on conflict (user_id, game_id, claim_date) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object(
      'claimed', false,
      'correct', true,
      'already_claimed', true,
      'credits_awarded', 0,
      'message', 'You already collected today’s Rune Decoder reward.',
      'server_date', to_char(v_day, 'YYYY-MM-DD')
    );
  end if;

  insert into public.dh_wallets(user_id, credits)
  values (v_user, v_reward)
  on conflict (user_id) do update
    set credits = public.dh_wallets.credits + excluded.credits,
        updated_at = now()
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

revoke all on function private.dh_claim_rune_decode(text) from public, anon;
grant execute on function private.dh_claim_rune_decode(text) to authenticated;

create or replace function public.dh_claim_rune_decode(p_answer text)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.dh_claim_rune_decode(p_answer);
$$;

revoke all on function public.dh_claim_rune_decode(text) from public, anon;
grant execute on function public.dh_claim_rune_decode(text) to authenticated;
