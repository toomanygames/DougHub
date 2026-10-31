create or replace function private.dh_claim_daily_game(p_game text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid();v_day date:=(now() at time zone 'utc')::date;v_reward integer;v_inserted integer;
begin
 if v_user is null then raise exception 'Please sign in to earn credits.';end if;
 v_reward:=case p_game when 'wordle' then 25 when 'match' then 15 when 'sequence' then 15 when 'trivia' then 15 else null end;
 if v_reward is null then raise exception 'That daily game is not reward-enabled.';end if;
 insert into public.dh_daily_claims(user_id,game_id,claim_date,credits_awarded) values(v_user,p_game,v_day,v_reward) on conflict(user_id,game_id,claim_date) do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then return jsonb_build_object('claimed',false,'credits_awarded',0,'message','You already collected today''s reward.');end if;
 insert into public.dh_wallets(user_id,credits) values(v_user,v_reward) on conflict(user_id) do update set credits=public.dh_wallets.credits+excluded.credits,updated_at=now();
 insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,v_reward,'Daily '||p_game||' completion');
 return jsonb_build_object('claimed',true,'credits_awarded',v_reward,'message','Daily reward collected!');
end $$;
revoke all on function private.dh_claim_daily_game(text) from public;
grant execute on function private.dh_claim_daily_game(text) to authenticated;
create or replace function public.dh_claim_daily_game(p_game text)
returns jsonb language sql security invoker set search_path=public,private as $$ select private.dh_claim_daily_game(p_game) $$;
revoke all on function public.dh_claim_daily_game(text) from public,anon;
grant execute on function public.dh_claim_daily_game(text) to authenticated;