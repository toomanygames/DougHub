-- Fixed-price character unlocks (no chance-based pack purchase) and UTC clock hardening.
revoke all on function public.dh_open_character_pack(text) from public,anon,authenticated;
revoke all on function private.dh_open_character_pack(text) from public,anon,authenticated;

create or replace function private.dh_buy_character(p_character_id text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid();v_character public.dh_characters%rowtype;v_price integer;v_credits integer;v_owned bigint;
begin
 if v_user is null then raise exception 'Please sign in to unlock a character.';end if;
 perform pg_advisory_xact_lock(hashtext('dh-character-'||p_character_id));
 select * into v_character from public.dh_characters where id=p_character_id;
 if not found then raise exception 'That character could not be found.';end if;
 if exists(select 1 from public.dh_character_inventory where user_id=v_user and character_id=p_character_id) then raise exception 'You already collected this character.';end if;
 v_price:=case v_character.rarity when 'common' then 40 when 'uncommon' then 60 when 'rare' then 90 when 'epic' then 130 when 'legendary' then 180 else null end;
 if v_price is null then raise exception 'This character cannot be unlocked.';end if;
 select count(*) into v_owned from public.dh_character_inventory where character_id=p_character_id;
 if v_owned>=v_character.total_supply then raise exception 'This character is no longer available.';end if;
 insert into public.dh_wallets(user_id,credits) values(v_user,0) on conflict(user_id) do nothing;
 select credits into v_credits from public.dh_wallets where user_id=v_user for update;
 if v_credits<v_price then raise exception 'You need % more credits to unlock this character.',v_price-v_credits;end if;
 update public.dh_wallets set credits=credits-v_price,updated_at=now() where user_id=v_user returning credits into v_credits;
 insert into public.dh_character_inventory(user_id,character_id,source) values(v_user,p_character_id,'shop');
 update public.profiles set reward_badges=array(select distinct unnest(coalesce(reward_badges,'{}'::text[])||v_character.badge_id)) where id=v_user;
 select count(*) into v_owned from public.dh_character_inventory where character_id=p_character_id;
 insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,-v_price,'Unlocked character: '||v_character.name);
 return jsonb_build_object('character_id',v_character.id,'character_name',v_character.name,'rarity',v_character.rarity,'art_path',v_character.art_path,'badge_id',v_character.badge_id,'total_supply',v_character.total_supply,'owned_count',v_owned,'credits_remaining',v_credits,'price',v_price);
end $$;
revoke all on function private.dh_buy_character(text) from public;
grant execute on function private.dh_buy_character(text) to authenticated;
create or replace function public.dh_buy_character(p_character_id text)
returns jsonb language sql security invoker set search_path=public,private as $$ select private.dh_buy_character(p_character_id) $$;
revoke all on function public.dh_buy_character(text) from public,anon;
grant execute on function public.dh_buy_character(text) to authenticated;

create or replace function private.dh_get_daily_status()
returns jsonb language plpgsql volatile security definer set search_path=public,private,pg_temp as $$
declare v_now timestamptz:=clock_timestamp();v_next timestamptz;v_day date;v_claims jsonb:='[]'::jsonb;v_user uuid:=auth.uid();
begin
 v_day:=(v_now at time zone 'UTC')::date;
 v_next:=((date_trunc('day',v_now at time zone 'UTC')+interval '1 day') at time zone 'UTC');
 if v_user is not null then select coalesce(jsonb_agg(game_id order by game_id),'[]'::jsonb) into v_claims from public.dh_daily_claims where user_id=v_user and claim_date=v_day;end if;
 return jsonb_build_object('server_date',to_char(v_day,'YYYY-MM-DD'),'server_now',v_now,'next_reset',v_next,'claimed_games',v_claims);
end $$;
create or replace function public.dh_get_daily_status()
returns jsonb language sql volatile security invoker set search_path=public,private as $$ select private.dh_get_daily_status() $$;
grant execute on function private.dh_get_daily_status() to anon,authenticated;
grant execute on function public.dh_get_daily_status() to anon,authenticated;
update public.dh_cosmetics set art_url='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shoes/Brown%201/brownShoe1.png' where id='kenney_shoes_brown';
