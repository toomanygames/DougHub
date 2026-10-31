-- Character resale and player marketplace.
-- All transfers and wallet changes are server-side; clients cannot write listing rows directly.
alter table public.dh_character_inventory add column if not exists finish text not null default 'normal';
alter table public.dh_character_loadouts add column if not exists finish text not null default 'normal';
do $$ begin
  if not exists(select 1 from pg_constraint where conname='dh_character_inventory_finish_check') then
    alter table public.dh_character_inventory add constraint dh_character_inventory_finish_check check(finish in ('normal','gold','rainbow'));
  end if;
  if not exists(select 1 from pg_constraint where conname='dh_character_loadouts_finish_check') then
    alter table public.dh_character_loadouts add constraint dh_character_loadouts_finish_check check(finish in ('normal','gold','rainbow'));
  end if;
end $$;
create table if not exists public.dh_character_market_listings(
 id uuid primary key default gen_random_uuid(),
 inventory_id uuid not null references public.dh_character_inventory(id) on delete cascade,
 seller_id uuid not null references auth.users(id) on delete cascade,
 character_id text not null references public.dh_characters(id),
 finish text not null default 'normal' check(finish in ('normal','gold','rainbow')),
 price integer not null check(price between 1 and 10000),
 status text not null default 'active' check(status in ('active','sold','cancelled')),
 created_at timestamptz not null default now(), sold_at timestamptz, buyer_id uuid references auth.users(id)
);
create unique index if not exists dh_character_market_one_active_listing on public.dh_character_market_listings(inventory_id) where status='active';
create index if not exists dh_character_market_active_created on public.dh_character_market_listings(created_at desc) where status='active';
alter table public.dh_character_market_listings enable row level security;
revoke all on public.dh_character_market_listings from anon,authenticated;

create or replace function private.dh_sell_character(p_inventory_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_item public.dh_character_inventory%rowtype; v_character public.dh_characters%rowtype; v_reward integer; v_balance integer;
begin
 if v_user is null then raise exception 'Please sign in first.'; end if;
 select * into v_item from public.dh_character_inventory where id=p_inventory_id and user_id=v_user for update;
 if not found then raise exception 'That character is not in your collection.'; end if;
 if exists(select 1 from public.dh_character_loadouts where user_id=v_user and character_id=v_item.character_id) then raise exception 'Remove this character from your active look before selling it.'; end if;
 if exists(select 1 from public.dh_character_market_listings where inventory_id=v_item.id and status='active') then raise exception 'Cancel its marketplace listing before selling it.'; end if;
 select * into v_character from public.dh_characters where id=v_item.character_id;
 v_reward:=case v_character.rarity when 'common' then 12 when 'uncommon' then 18 when 'rare' then 27 when 'epic' then 39 when 'legendary' then 54 else 0 end;
 if v_reward=0 then raise exception 'This character cannot be sold.'; end if;
 insert into public.dh_wallets(user_id,credits) values(v_user,0) on conflict(user_id) do nothing;
 update public.dh_wallets set credits=credits+v_reward,updated_at=now() where user_id=v_user returning credits into v_balance;
 delete from public.dh_character_inventory where id=v_item.id;
 insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,v_reward,'Sold character: '||v_character.name);
 return jsonb_build_object('sold',true,'character_id',v_character.id,'character_name',v_character.name,'rarity',v_character.rarity,'credits_earned',v_reward,'credits_remaining',v_balance);
end $$;

create or replace function private.dh_create_market_listing(p_inventory_id uuid,p_price integer,p_finish text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_item public.dh_character_inventory%rowtype; v_character public.dh_characters%rowtype; v_listing uuid;
begin
 if v_user is null then raise exception 'Please sign in to list a character.'; end if;
 if p_price is null or p_price<1 or p_price>10000 then raise exception 'Choose a price from 1 to 10,000 credits.'; end if;
 if p_finish not in ('normal','gold','rainbow') then raise exception 'Choose a valid character finish.'; end if;
 select * into v_item from public.dh_character_inventory where id=p_inventory_id and user_id=v_user for update;
 if not found then raise exception 'That character is not in your collection.'; end if;
 if exists(select 1 from public.dh_character_loadouts where user_id=v_user and character_id=v_item.character_id) then raise exception 'Remove this character from your active look before listing it.'; end if;
 if exists(select 1 from public.dh_character_market_listings where inventory_id=v_item.id and status='active') then raise exception 'That character is already listed.'; end if;
 select * into v_character from public.dh_characters where id=v_item.character_id;
 update public.dh_character_inventory set finish=p_finish where id=v_item.id;
 insert into public.dh_character_market_listings(inventory_id,seller_id,character_id,finish,price) values(v_item.id,v_user,v_item.character_id,p_finish,p_price) returning id into v_listing;
 return jsonb_build_object('listed',true,'listing_id',v_listing,'character_name',v_character.name,'finish',p_finish,'price',p_price);
end $$;

create or replace function private.dh_cancel_market_listing(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_listing public.dh_character_market_listings%rowtype;
begin
 if v_user is null then raise exception 'Please sign in first.'; end if;
 select * into v_listing from public.dh_character_market_listings where id=p_listing_id and seller_id=v_user and status='active' for update;
 if not found then raise exception 'That active listing was not found.'; end if;
 update public.dh_character_market_listings set status='cancelled' where id=v_listing.id;
 return jsonb_build_object('cancelled',true,'listing_id',v_listing.id);
end $$;

create or replace function private.dh_buy_market_listing(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_listing public.dh_character_market_listings%rowtype; v_character public.dh_characters%rowtype; v_buyer_balance integer; v_seller_balance integer;
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
 insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,-v_listing.price,'Bought character: '||v_character.name),(v_listing.seller_id,v_listing.price,'Sold character: '||v_character.name);
 return jsonb_build_object('purchased',true,'character_id',v_character.id,'character_name',v_character.name,'rarity',v_character.rarity,'finish',v_listing.finish,'price',v_listing.price,'credits_remaining',v_buyer_balance,'seller_credits',v_seller_balance);
end $$;

create or replace function private.dh_get_market_listings()
returns table(listing_id uuid,character_id text,character_name text,pack_type text,rarity text,art_path text,finish text,price integer,seller_id uuid,seller_name text,total_supply integer,owned_count bigint,created_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select l.id,c.id,c.name,c.pack_type,c.rarity,c.art_path,l.finish,l.price,l.seller_id,coalesce(p.username,'DougHub player'),c.total_supply,
 (select count(*) from public.dh_character_inventory i where i.character_id=c.id),l.created_at
 from public.dh_character_market_listings l join public.dh_characters c on c.id=l.character_id left join public.profiles p on p.id=l.seller_id
 where l.status='active' order by l.created_at desc;
$$;

create or replace function private.dh_save_character_finish(p_character_id text,p_cosmetic_ids text[],p_finish text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_ids text[]:=coalesce(p_cosmetic_ids,'{}'::text[]);
begin
 if v_user is null then raise exception 'Please sign in to save your character.'; end if;
 if p_finish not in ('normal','gold','rainbow') then raise exception 'Choose a valid character finish.'; end if;
 if not exists(select 1 from public.dh_character_inventory where user_id=v_user and character_id=p_character_id and finish=p_finish) then raise exception 'You need to own this character in that finish first.'; end if;
 if exists(select 1 from unnest(v_ids) as x(id) where not exists(select 1 from public.dh_cosmetic_inventory i where i.user_id=v_user and i.cosmetic_id=x.id)) then raise exception 'You can only equip accessories in your collection.'; end if;
 if exists(select 1 from unnest(v_ids) as x(id) join public.dh_cosmetics c on c.id=x.id group by c.category having count(*)>1) then raise exception 'Choose only one accessory per category.'; end if;
 insert into public.dh_character_loadouts(user_id,character_id,cosmetic_ids,finish,updated_at) values(v_user,p_character_id,v_ids,p_finish,now())
 on conflict(user_id) do update set character_id=excluded.character_id,cosmetic_ids=excluded.cosmetic_ids,finish=excluded.finish,updated_at=now();
 return jsonb_build_object('saved',true,'character_id',p_character_id,'finish',p_finish,'cosmetic_ids',v_ids);
end $$;

create or replace function public.dh_sell_character(p_inventory_id uuid) returns jsonb language sql set search_path='' as $$ select private.dh_sell_character(p_inventory_id) $$;
create or replace function public.dh_create_market_listing(p_inventory_id uuid,p_price integer,p_finish text) returns jsonb language sql set search_path='' as $$ select private.dh_create_market_listing(p_inventory_id,p_price,p_finish) $$;
create or replace function public.dh_cancel_market_listing(p_listing_id uuid) returns jsonb language sql set search_path='' as $$ select private.dh_cancel_market_listing(p_listing_id) $$;
create or replace function public.dh_buy_market_listing(p_listing_id uuid) returns jsonb language sql set search_path='' as $$ select private.dh_buy_market_listing(p_listing_id) $$;
create or replace function public.dh_get_market_listings()
returns table(listing_id uuid,character_id text,character_name text,pack_type text,rarity text,art_path text,finish text,price integer,seller_id uuid,seller_name text,total_supply integer,owned_count bigint,created_at timestamptz)
language sql stable set search_path='' as $$ select * from private.dh_get_market_listings() $$;
create or replace function public.dh_save_character_finish(p_character_id text,p_cosmetic_ids text[],p_finish text) returns jsonb language sql set search_path='' as $$ select private.dh_save_character_finish(p_character_id,p_cosmetic_ids,p_finish) $$;

revoke all on function private.dh_sell_character(uuid) from public;
revoke all on function private.dh_create_market_listing(uuid,integer,text) from public;
revoke all on function private.dh_cancel_market_listing(uuid) from public;
revoke all on function private.dh_buy_market_listing(uuid) from public;
revoke all on function private.dh_get_market_listings() from public;
revoke all on function private.dh_save_character_finish(text,text[],text) from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.dh_get_market_listings() to anon,authenticated;
grant execute on function private.dh_sell_character(uuid) to authenticated;
grant execute on function private.dh_create_market_listing(uuid,integer,text) to authenticated;
grant execute on function private.dh_cancel_market_listing(uuid) to authenticated;
grant execute on function private.dh_buy_market_listing(uuid) to authenticated;
grant execute on function private.dh_save_character_finish(text,text[],text) to authenticated;
revoke all on function public.dh_sell_character(uuid) from public,anon;
revoke all on function public.dh_create_market_listing(uuid,integer,text) from public,anon;
revoke all on function public.dh_cancel_market_listing(uuid) from public,anon;
revoke all on function public.dh_buy_market_listing(uuid) from public,anon;
revoke all on function public.dh_get_market_listings() from public;
revoke all on function public.dh_save_character_finish(text,text[],text) from public,anon;
grant execute on function public.dh_sell_character(uuid) to authenticated;
grant execute on function public.dh_create_market_listing(uuid,integer,text) to authenticated;
grant execute on function public.dh_cancel_market_listing(uuid) to authenticated;
grant execute on function public.dh_buy_market_listing(uuid) to authenticated;
grant execute on function public.dh_get_market_listings() to anon,authenticated;
grant execute on function public.dh_save_character_finish(text,text[],text) to authenticated;
