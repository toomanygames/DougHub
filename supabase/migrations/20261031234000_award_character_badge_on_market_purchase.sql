-- Ensure marketplace purchases preserve the character's reward badge for the new owner.
create or replace function private.dh_buy_market_listing(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_listing public.dh_character_market_listings%rowtype;
  v_character public.dh_characters%rowtype;
  v_buyer_balance integer;
  v_seller_balance integer;
begin
  if v_user is null then raise exception 'Please sign in to buy a character.'; end if;
  select * into v_listing from public.dh_character_market_listings where id=p_listing_id and status='active' for update;
  if not found then raise exception 'That listing is no longer available.'; end if;
  if v_listing.seller_id=v_user then raise exception 'You cannot buy your own listing.'; end if;
  insert into public.dh_wallets(user_id,credits) values(v_user,0) on conflict(user_id) do nothing;
  select credits into v_buyer_balance from public.dh_wallets where user_id=v_user for update;
  if v_buyer_balance<v_listing.price then raise exception 'You need % more credits.',v_listing.price-v_buyer_balance; end if;
  insert into public.dh_wallets(user_id,credits) values(v_listing.seller_id,0) on conflict(user_id) do nothing;
  update public.dh_wallets set credits=credits-v_listing.price,updated_at=now() where user_id=v_user returning credits into v_buyer_balance;
  update public.dh_wallets set credits=credits+v_listing.price,updated_at=now() where user_id=v_listing.seller_id returning credits into v_seller_balance;
  update public.dh_character_inventory set user_id=v_user,source='marketplace',finish=v_listing.finish where id=v_listing.inventory_id and user_id=v_listing.seller_id;
  if not found then raise exception 'The seller no longer owns that character.'; end if;
  update public.dh_character_market_listings set status='sold',sold_at=now(),buyer_id=v_user where id=v_listing.id;
  select * into v_character from public.dh_characters where id=v_listing.character_id;
  update public.profiles set reward_badges=array(select distinct unnest(coalesce(reward_badges,'{}'::text[])||v_character.badge_id)) where id=v_user;
  insert into public.dh_credit_transactions(user_id,amount,reason)
    values(v_user,-v_listing.price,'Bought character: '||v_character.name),(v_listing.seller_id,v_listing.price,'Sold character: '||v_character.name);
  return jsonb_build_object('purchased',true,'character_id',v_character.id,'character_name',v_character.name,
    'rarity',v_character.rarity,'finish',v_listing.finish,'price',v_listing.price,
    'credits_remaining',v_buyer_balance,'seller_credits',v_seller_balance);
end;
$$;
