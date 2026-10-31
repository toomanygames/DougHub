-- Rotating accessory stock: items remain direct-purchase cosmetics, never randomized rewards.
create table if not exists public.dh_cosmetic_stock (
  cosmetic_id text primary key references public.dh_cosmetics(id) on delete cascade,
  stock_count integer not null default 0 check(stock_count >= 0),
  next_restock_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.dh_cosmetic_stock enable row level security;
revoke all on public.dh_cosmetic_stock from anon, authenticated, public;

create or replace function private.dh_roll_cosmetic_stock(p_rarity text)
returns integer language plpgsql volatile security definer set search_path=''
as $$
declare v_roll numeric:=pg_catalog.random();
begin
  case p_rarity
    when 'common' then return 8 + floor(pg_catalog.random()*13)::integer;
    when 'uncommon' then return 4 + floor(pg_catalog.random()*7)::integer;
    when 'rare' then
      if v_roll < 0.28 then return 0; end if;
      return 1 + floor(pg_catalog.random()*4)::integer;
    when 'epic' then
      if v_roll < 0.52 then return 0; end if;
      return 1 + floor(pg_catalog.random()*2)::integer;
    when 'legendary' then
      if v_roll < 0.74 then return 0; end if;
      return 1;
    else return 2 + floor(pg_catalog.random()*4)::integer;
  end case;
end;
$$;
revoke all on function private.dh_roll_cosmetic_stock(text) from public,anon,authenticated;

drop function if exists public.dh_get_cosmetic_catalog();
drop function if exists private.dh_get_cosmetic_catalog();
create function private.dh_get_cosmetic_catalog()
returns table(id text,name text,category text,rarity text,price integer,art_key text,description text,
 owned boolean,equipped boolean,art_url text,stock_count integer,next_restock_at timestamptz)
language plpgsql volatile security definer set search_path=''
as $$
begin
  insert into public.dh_cosmetic_stock(cosmetic_id,stock_count,next_restock_at)
  select c.id,private.dh_roll_cosmetic_stock(c.rarity),now()+interval '30 minutes'
  from public.dh_cosmetics c on conflict(cosmetic_id) do nothing;

  update public.dh_cosmetic_stock s
  set stock_count=private.dh_roll_cosmetic_stock(c.rarity),
      next_restock_at=now()+interval '30 minutes',updated_at=now()
  from public.dh_cosmetics c
  where c.id=s.cosmetic_id and s.next_restock_at<=now();

  return query
  select c.id,c.name,c.category,c.rarity,c.price,c.art_key,c.description,
    exists(select 1 from public.dh_cosmetic_inventory i where i.user_id=auth.uid() and i.cosmetic_id=c.id),
    c.id=any(coalesce(l.cosmetic_ids,'{}'::text[])),c.art_url,s.stock_count,s.next_restock_at
  from public.dh_cosmetics c
  join public.dh_cosmetic_stock s on s.cosmetic_id=c.id
  left join public.dh_character_loadouts l on l.user_id=auth.uid()
  order by case c.category when 'headwear' then 1 when 'face' then 2 when 'neck' then 3 when 'back' then 4 when 'hair' then 5 when 'outfit' then 6 when 'pants' then 7 when 'shoes' then 8 else 9 end,
    case c.rarity when 'common' then 1 when 'uncommon' then 2 when 'rare' then 3 when 'epic' then 4 else 5 end,c.name;
end;
$$;

create or replace function private.dh_buy_cosmetic(p_cosmetic_id text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_item public.dh_cosmetics%rowtype;v_stock public.dh_cosmetic_stock%rowtype;v_credits integer;
begin
 if v_user is null then raise exception 'Please sign in to buy accessories.';end if;
 select * into v_item from public.dh_cosmetics where id=p_cosmetic_id;
 if not found then raise exception 'That accessory could not be found.';end if;
 if exists(select 1 from public.dh_cosmetic_inventory where user_id=v_user and cosmetic_id=p_cosmetic_id) then
   raise exception 'You already own this accessory.';
 end if;
 select * into v_stock from public.dh_cosmetic_stock where cosmetic_id=p_cosmetic_id for update;
 if not found or v_stock.stock_count<=0 then
   raise exception 'Out of stock. Please wait for the next shop restock.';
 end if;
 insert into public.dh_wallets(user_id,credits) values(v_user,0) on conflict(user_id) do nothing;
 select credits into v_credits from public.dh_wallets where user_id=v_user for update;
 if v_credits<v_item.price then raise exception 'You need % more credits for this accessory.',v_item.price-v_credits;end if;
 update public.dh_wallets set credits=credits-v_item.price,updated_at=now() where user_id=v_user returning credits into v_credits;
 update public.dh_cosmetic_stock set stock_count=stock_count-1,updated_at=now() where cosmetic_id=p_cosmetic_id;
 insert into public.dh_cosmetic_inventory(user_id,cosmetic_id,source) values(v_user,p_cosmetic_id,'shop');
 if v_item.price>0 then insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,-v_item.price,'Bought accessory: '||v_item.name);end if;
 return jsonb_build_object('owned',true,'credits_remaining',v_credits,'cosmetic_id',v_item.id,'stock_remaining',v_stock.stock_count-1);
end;
$$;

create or replace function private.dh_restock_cosmetics(p_cosmetic_id text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_count integer;
begin
 if v_user is null or not exists(select 1 from public.profiles p where p.id=v_user and (coalesce(p.is_admin,false) or coalesce(p.is_developer,false) or coalesce(p.is_owner,false))) then
   raise exception 'Only DougHub staff can manually restock the accessory shop.';
 end if;
 if p_cosmetic_id is not null and not exists(select 1 from public.dh_cosmetics where id=p_cosmetic_id) then raise exception 'That accessory does not exist.';end if;
 update public.dh_cosmetic_stock s set stock_count=private.dh_roll_cosmetic_stock(c.rarity),
   next_restock_at=now()+interval '30 minutes',updated_at=now()
 from public.dh_cosmetics c where c.id=s.cosmetic_id and (p_cosmetic_id is null or c.id=p_cosmetic_id);
 get diagnostics v_count=row_count;
 return jsonb_build_object('restocked',v_count,'next_restock_at',now()+interval '30 minutes');
end;
$$;

create function public.dh_get_cosmetic_catalog()
returns table(id text,name text,category text,rarity text,price integer,art_key text,description text,
 owned boolean,equipped boolean,art_url text,stock_count integer,next_restock_at timestamptz)
language sql volatile set search_path='' as $$ select * from private.dh_get_cosmetic_catalog() $$;
create or replace function public.dh_buy_cosmetic(p_cosmetic_id text)
returns jsonb language sql set search_path='' as $$ select private.dh_buy_cosmetic(p_cosmetic_id) $$;
create or replace function public.dh_restock_cosmetics(p_cosmetic_id text default null)
returns jsonb language sql set search_path='' as $$ select private.dh_restock_cosmetics(p_cosmetic_id) $$;

revoke all on function private.dh_get_cosmetic_catalog() from public;
revoke all on function private.dh_buy_cosmetic(text) from public;
revoke all on function private.dh_restock_cosmetics(text) from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.dh_get_cosmetic_catalog() to anon,authenticated;
grant execute on function private.dh_buy_cosmetic(text) to authenticated;
grant execute on function private.dh_restock_cosmetics(text) to authenticated;
revoke all on function public.dh_get_cosmetic_catalog() from public;
revoke all on function public.dh_buy_cosmetic(text) from public,anon;
revoke all on function public.dh_restock_cosmetics(text) from public,anon;
grant execute on function public.dh_get_cosmetic_catalog() to anon,authenticated;
grant execute on function public.dh_buy_cosmetic(text) to authenticated;
grant execute on function public.dh_restock_cosmetics(text) to authenticated;
