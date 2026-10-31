-- Return the inventory row ID so each duplicate character can be listed or sold independently.
drop function if exists public.dh_get_market_listings();
drop function if exists private.dh_get_market_listings();
create function private.dh_get_market_listings()
returns table(listing_id uuid,inventory_id uuid,character_id text,character_name text,pack_type text,rarity text,art_path text,
  finish text,price integer,seller_id uuid,seller_name text,total_supply integer,owned_count bigint,created_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select l.id,l.inventory_id,c.id,c.name,c.pack_type,c.rarity,c.art_path,l.finish,l.price,l.seller_id,
  coalesce(p.username,'DougHub player'),c.total_supply,
  (select count(*) from public.dh_character_inventory i where i.character_id=c.id),l.created_at
 from public.dh_character_market_listings l
 join public.dh_characters c on c.id=l.character_id
 left join public.profiles p on p.id=l.seller_id
 where l.status='active' order by l.created_at desc;
$$;
create function public.dh_get_market_listings()
returns table(listing_id uuid,inventory_id uuid,character_id text,character_name text,pack_type text,rarity text,art_path text,
  finish text,price integer,seller_id uuid,seller_name text,total_supply integer,owned_count bigint,created_at timestamptz)
language sql stable set search_path='' as $$ select * from private.dh_get_market_listings() $$;
revoke all on function private.dh_get_market_listings() from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.dh_get_market_listings() to anon,authenticated;
revoke all on function public.dh_get_market_listings() from public;
grant execute on function public.dh_get_market_listings() to anon,authenticated;
