create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists public.dh_characters (
 id text primary key, name text not null,
 pack_type text not null check (pack_type in ('woodland','ocean','cosmic')),
 rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary')),
 rarity_weight numeric not null check (rarity_weight>0),
 total_supply integer not null check (total_supply>0),
 art_path text not null, badge_id text not null unique, created_at timestamptz not null default now()
);
create table if not exists public.dh_wallets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 credits integer not null default 0 check (credits>=0), updated_at timestamptz not null default now()
);
create table if not exists public.dh_character_inventory (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 character_id text not null references public.dh_characters(id), acquired_at timestamptz not null default now(), source text not null default 'pack'
);
create index if not exists dh_character_inventory_character_idx on public.dh_character_inventory(character_id);
create index if not exists dh_character_inventory_user_idx on public.dh_character_inventory(user_id);
create table if not exists public.dh_daily_claims (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 game_id text not null, claim_date date not null, credits_awarded integer not null, created_at timestamptz not null default now(),
 unique(user_id,game_id,claim_date)
);
create table if not exists public.dh_credit_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 amount integer not null, reason text not null, created_at timestamptz not null default now()
);
create index if not exists dh_credit_transactions_user_idx on public.dh_credit_transactions(user_id,created_at desc);

alter table public.dh_characters enable row level security;
alter table public.dh_wallets enable row level security;
alter table public.dh_character_inventory enable row level security;
alter table public.dh_daily_claims enable row level security;
alter table public.dh_credit_transactions enable row level security;
drop policy if exists "Character catalog is public" on public.dh_characters;
create policy "Character catalog is public" on public.dh_characters for select to anon,authenticated using(true);
drop policy if exists "Users read own wallet" on public.dh_wallets;
create policy "Users read own wallet" on public.dh_wallets for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Users read own inventory" on public.dh_character_inventory;
create policy "Users read own inventory" on public.dh_character_inventory for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Users read own daily claims" on public.dh_daily_claims;
create policy "Users read own daily claims" on public.dh_daily_claims for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Users read own credit history" on public.dh_credit_transactions;
create policy "Users read own credit history" on public.dh_credit_transactions for select to authenticated using((select auth.uid())=user_id);
grant select on public.dh_characters to anon,authenticated;
grant select on public.dh_wallets,public.dh_character_inventory,public.dh_daily_claims,public.dh_credit_transactions to authenticated;
revoke insert,update,delete on public.dh_characters,public.dh_wallets,public.dh_character_inventory,public.dh_daily_claims,public.dh_credit_transactions from anon,authenticated;

insert into public.dh_characters(id,name,pack_type,rarity,rarity_weight,total_supply,art_path,badge_id) values
('woodland_rabbit','Clover Bunny','woodland','common',100,300,'Games/characters/openmoji/rabbit.svg','badge_clover_bunny'),
('woodland_frog','Moss Hopper','woodland','common',100,300,'Games/characters/openmoji/frog.svg','badge_moss_hopper'),
('woodland_fox','Ember Fox','woodland','uncommon',32,180,'Games/characters/openmoji/fox.svg','badge_ember_fox'),
('woodland_owl','Moonlit Owl','woodland','rare',10,80,'Games/characters/openmoji/owl.svg','badge_moonlit_owl'),
('woodland_bear','Honey Bear','woodland','legendary',1,18,'Games/characters/openmoji/bear.svg','badge_honey_bear'),
('ocean_turtle','Tide Turtle','ocean','common',100,300,'Games/characters/openmoji/turtle.svg','badge_tide_turtle'),
('ocean_crab','Coral Crab','ocean','common',100,300,'Games/characters/openmoji/crab.svg','badge_coral_crab'),
('ocean_dolphin','Splash Dolphin','ocean','uncommon',32,180,'Games/characters/openmoji/dolphin.svg','badge_splash_dolphin'),
('ocean_octopus','Inkling','ocean','rare',10,80,'Games/characters/openmoji/octopus.svg','badge_inkling'),
('ocean_whale','Starlight Whale','ocean','legendary',1,18,'Games/characters/openmoji/whale.svg','badge_starlight_whale'),
('cosmic_ghost','Orbit Ghost','cosmic','common',100,300,'Games/characters/openmoji/ghost.svg','badge_orbit_ghost'),
('cosmic_alien','Zippy Alien','cosmic','uncommon',32,180,'Games/characters/openmoji/alien.svg','badge_zippy_alien'),
('cosmic_robot','Byte Bot','cosmic','rare',10,80,'Games/characters/openmoji/robot.svg','badge_byte_bot'),
('cosmic_dragon','Nebula Dragon','cosmic','epic',3,35,'Games/characters/openmoji/dragon.svg','badge_nebula_dragon'),
('cosmic_unicorn','Prism Unicorn','cosmic','legendary',1,18,'Games/characters/openmoji/unicorn.svg','badge_prism_unicorn')
on conflict(id) do update set name=excluded.name,pack_type=excluded.pack_type,rarity=excluded.rarity,rarity_weight=excluded.rarity_weight,art_path=excluded.art_path,badge_id=excluded.badge_id;

create or replace function private.dh_get_character_catalog(p_pack text default null)
returns table(character_id text,character_name text,pack_type text,rarity text,art_path text,badge_id text,total_supply integer,owned_count bigint,remaining_count bigint)
language sql stable security definer set search_path=public,private,pg_temp as $$
 select c.id,c.name,c.pack_type,c.rarity,c.art_path,c.badge_id,c.total_supply,count(i.id),greatest(c.total_supply-count(i.id),0)
 from public.dh_characters c left join public.dh_character_inventory i on i.character_id=c.id
 where p_pack is null or c.pack_type=p_pack group by c.id
 order by c.pack_type,case c.rarity when 'common' then 1 when 'uncommon' then 2 when 'rare' then 3 when 'epic' then 4 else 5 end,c.name
$$;
revoke all on function private.dh_get_character_catalog(text) from public;
grant execute on function private.dh_get_character_catalog(text) to anon,authenticated;
create or replace function public.dh_get_character_catalog(p_pack text default null)
returns table(character_id text,character_name text,pack_type text,rarity text,art_path text,badge_id text,total_supply integer,owned_count bigint,remaining_count bigint)
language sql stable security invoker set search_path=public,private as $$ select * from private.dh_get_character_catalog(p_pack) $$;
grant execute on function public.dh_get_character_catalog(text) to anon,authenticated;

create or replace function private.dh_claim_daily_game(p_game text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid();v_day date:=(now() at time zone 'utc')::date;v_reward integer:=25;v_inserted integer;
begin
 if v_user is null then raise exception 'Please sign in to earn credits.';end if;
 if p_game<>'wordle' then raise exception 'That daily game is not reward-enabled.';end if;
 insert into public.dh_daily_claims(user_id,game_id,claim_date,credits_awarded) values(v_user,p_game,v_day,v_reward) on conflict(user_id,game_id,claim_date) do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then return jsonb_build_object('claimed',false,'credits_awarded',0,'message','You already collected today''s reward.');end if;
 insert into public.dh_wallets(user_id,credits) values(v_user,v_reward) on conflict(user_id) do update set credits=public.dh_wallets.credits+excluded.credits,updated_at=now();
 insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,v_reward,'Daily Wordle completion');
 return jsonb_build_object('claimed',true,'credits_awarded',v_reward,'message','Daily reward collected!');
end $$;
revoke all on function private.dh_claim_daily_game(text) from public;
grant execute on function private.dh_claim_daily_game(text) to authenticated;
create or replace function public.dh_claim_daily_game(p_game text)
returns jsonb language sql security invoker set search_path=public,private as $$ select private.dh_claim_daily_game(p_game) $$;
grant execute on function public.dh_claim_daily_game(text) to authenticated;

create or replace function private.dh_open_character_pack(p_pack text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid();v_price integer:=100;v_credits integer;v_character public.dh_characters%rowtype;v_owned bigint;
begin
 if v_user is null then raise exception 'Please sign in before opening a pack.';end if;
 if p_pack not in ('woodland','ocean','cosmic') then raise exception 'Unknown character pack.';end if;
 perform pg_advisory_xact_lock(hashtext('dh-pack-'||p_pack));
 insert into public.dh_wallets(user_id,credits) values(v_user,0) on conflict(user_id) do nothing;
 select credits into v_credits from public.dh_wallets where user_id=v_user for update;
 if v_credits<v_price then raise exception 'You need % credits to open this pack.',v_price;end if;
 select c.* into v_character from public.dh_characters c
 where c.pack_type=p_pack and (select count(*) from public.dh_character_inventory i where i.character_id=c.id)<c.total_supply
 order by -ln(greatest(random(),0.0000000001))/c.rarity_weight limit 1;
 if not found then raise exception 'This pack is sold out.';end if;
 update public.dh_wallets set credits=credits-v_price,updated_at=now() where user_id=v_user returning credits into v_credits;
 insert into public.dh_character_inventory(user_id,character_id,source) values(v_user,v_character.id,'pack');
 update public.profiles set reward_badges=array(select distinct unnest(coalesce(reward_badges,'{}'::text[])||v_character.badge_id)) where id=v_user;
 select count(*) into v_owned from public.dh_character_inventory where character_id=v_character.id;
 insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,-v_price,'Opened '||p_pack||' character pack');
 return jsonb_build_object('character_id',v_character.id,'character_name',v_character.name,'pack_type',v_character.pack_type,'rarity',v_character.rarity,'art_path',v_character.art_path,'badge_id',v_character.badge_id,'total_supply',v_character.total_supply,'owned_count',v_owned,'credits_remaining',v_credits,'price',v_price);
end $$;
revoke all on function private.dh_open_character_pack(text) from public;
grant execute on function private.dh_open_character_pack(text) to authenticated;
create or replace function public.dh_open_character_pack(p_pack text)
returns jsonb language sql security invoker set search_path=public,private as $$ select private.dh_open_character_pack(p_pack) $$;
grant execute on function public.dh_open_character_pack(text) to authenticated;
