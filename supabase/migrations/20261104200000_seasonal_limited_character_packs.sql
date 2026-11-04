-- Seasonal limited character packs.
-- Each holiday/season has a pack whose characters can only be bought while the season is open.
-- The calendar runs automatically on America/Los_Angeles time. The Owner can force a season open or closed.

alter table public.dh_characters add column if not exists limited boolean not null default false;
alter table public.dh_characters add column if not exists season_key text;

create table if not exists public.dh_seasons (
  season_key text primary key,
  pack_type text not null unique,
  title text not null,
  blurb text not null default '',
  start_month integer not null check (start_month between 1 and 12),
  end_month integer not null check (end_month between 1 and 12),
  manual_open boolean,            -- null = follow the calendar, true/false = Owner override
  sort_order integer not null default 0
);
alter table public.dh_seasons enable row level security;
drop policy if exists "Signed-in members read seasons" on public.dh_seasons;
create policy "Signed-in members read seasons" on public.dh_seasons for select to authenticated using (true);

insert into public.dh_seasons (season_key, pack_type, title, blurb, start_month, end_month, sort_order) values
  ('valentine', 'valentine', 'Valentine Pack',     'Sweet critters for the month of hearts.',        2, 2, 1),
  ('spring',    'spring',    'Spring Bloom Pack',  'Flower crowns and rainy-day friends.',           3, 4, 2),
  ('summer',    'summer',    'Summer Splash Pack', 'Sunshine, sunglasses and beach days.',           6, 7, 3),
  ('halloween', 'halloween', 'Halloween Pack',     'Costumed critters and spooky friends.',          10, 10, 4),
  ('harvest',   'harvest',   'Harvest Pack',       'Autumn leaves, scarecrows and a harvest moon.',  11, 11, 5),
  ('winter',    'winter',    'Winter Holiday Pack','Cozy scarves, elves and a very jolly bear.',     12, 1, 6)
on conflict (season_key) do nothing;

-- Allow the new seasonal pack types.
alter table public.dh_characters drop constraint if exists dh_characters_pack_type_check;
alter table public.dh_characters add constraint dh_characters_pack_type_check
  check (pack_type = any (array['woodland','ocean','cosmic','halloween','space','harvest','winter','valentine','spring','summer']));

-- Limited editions: smaller supply than the everyday packs. Halloween joins the limited tier.
update public.dh_characters set limited = true, season_key = 'halloween' where pack_type = 'halloween';
update public.dh_characters set total_supply = case rarity when 'common' then 150 when 'uncommon' then 90 when 'rare' then 45 when 'epic' then 20 else 8 end
 where pack_type = 'halloween'
   and total_supply >= (select count(*) from public.dh_character_inventory i where i.character_id = dh_characters.id);

with new_chars(id, name, pack, rarity, file) as (values
  ('harvest_leaf_bear',        'Leafy Bear',          'harvest',   'common',    'harvest/leaf-bear'),
  ('harvest_corn_pig',         'Corn Pig',            'harvest',   'uncommon',  'harvest/corn-pig'),
  ('harvest_scarecrow_frog',   'Scarecrow Frog',      'harvest',   'rare',      'harvest/scarecrow-frog'),
  ('harvest_patch_bunny',      'Pumpkin Patch Bunny', 'harvest',   'epic',      'harvest/patch-bunny'),
  ('harvest_moon_fox',         'Harvest Moon Fox',    'harvest',   'legendary', 'harvest/moon-fox'),
  ('winter_snow_penguin',      'Snow Penguin',        'winter',    'common',    'winter/snow-penguin'),
  ('winter_elf_fox',           'Elf Fox',             'winter',    'uncommon',  'winter/elf-fox'),
  ('winter_red_nose_reindeer', 'Red-Nose Reindeer',   'winter',    'rare',      'winter/red-nose-reindeer'),
  ('winter_candy_bunny',       'Candy Cane Bunny',    'winter',    'epic',      'winter/candy-bunny'),
  ('winter_santa_bear',        'Santa Bear',          'winter',    'legendary', 'winter/santa-bear'),
  ('valentine_heart_panda',    'Heart Panda',         'valentine', 'common',    'valentine/heart-panda'),
  ('valentine_rose_bunny',     'Rose Bunny',          'valentine', 'uncommon',  'valentine/rose-bunny'),
  ('valentine_cupid_pig',      'Cupid Pig',           'valentine', 'rare',      'valentine/cupid-pig'),
  ('valentine_love_fox',       'Love Fox',            'valentine', 'epic',      'valentine/love-fox'),
  ('valentine_sweetheart_bear','Sweetheart Bear',     'valentine', 'legendary', 'valentine/sweetheart-bear'),
  ('spring_blossom_bunny',     'Blossom Bunny',       'spring',    'common',    'spring/blossom-bunny'),
  ('spring_rain_duck',         'Rainy Day Duck',      'spring',    'uncommon',  'spring/rain-duck'),
  ('spring_daisy_frog',        'Daisy Frog',          'spring',    'rare',      'spring/daisy-frog'),
  ('spring_rainbow_chick',     'Rainbow Chick',       'spring',    'epic',      'spring/rainbow-chick'),
  ('spring_garden_panda',      'Garden Fairy Panda',  'spring',    'legendary', 'spring/garden-panda'),
  ('summer_sunny_duck',        'Sunny Duck',          'summer',    'common',    'summer/sunny-duck'),
  ('summer_beach_pig',         'Beach Pig',           'summer',    'uncommon',  'summer/beach-pig'),
  ('summer_surf_frog',         'Surf Frog',           'summer',    'rare',      'summer/surf-frog'),
  ('summer_pool_penguin',      'Pool Penguin',        'summer',    'epic',      'summer/pool-penguin'),
  ('summer_sun_bear',          'Sun King Bear',       'summer',    'legendary', 'summer/sun-bear')
)
insert into public.dh_characters (id, name, pack_type, rarity, rarity_weight, total_supply, art_path, badge_id, limited, season_key)
select n.id, n.name, n.pack, n.rarity,
       coalesce((select max(c.rarity_weight) from public.dh_characters c where c.rarity = n.rarity), 1),
       case n.rarity when 'common' then 150 when 'uncommon' then 90 when 'rare' then 45 when 'epic' then 20 else 8 end,
       'https://doughub.online/Games/characters/seasonal/' || n.file || '.svg',
       'badge_' || n.id, true, n.pack
  from new_chars n
on conflict (id) do nothing;

-- ------------------------------------------------------------ calendar helpers
create or replace function private.dh_month_in_window(p_month integer, p_start integer, p_end integer)
returns boolean language sql immutable set search_path = '' as $$
  select case when p_start <= p_end then p_month between p_start and p_end else (p_month >= p_start or p_month <= p_end) end
$$;

create or replace function private.dh_season_is_open(p_pack text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select coalesce(s.manual_open,
              private.dh_month_in_window(extract(month from (now() at time zone 'America/Los_Angeles'))::integer, s.start_month, s.end_month))
       from public.dh_seasons s where s.pack_type = p_pack),
    true)
$$;
revoke all on function private.dh_season_is_open(text) from public, anon, authenticated;

-- Everyday packs stay always on. Seasonal characters can only be bought while their season is open.
create or replace function private.dh_buy_character(p_character_id text)
returns jsonb language plpgsql security definer set search_path to 'public', 'private', 'pg_temp' as $function$
declare
 v_user uuid:=auth.uid();
 v_character public.dh_characters%rowtype;
 v_price integer;
 v_credits integer;
 v_owned bigint;
begin
 if v_user is null then raise exception 'Please sign in to unlock a character.'; end if;
 perform pg_advisory_xact_lock(hashtext('dh-character-'||p_character_id));
 select * into v_character from public.dh_characters where id=p_character_id;
 if not found then raise exception 'That character could not be found.'; end if;
 if not private.dh_season_is_open(v_character.pack_type) then
   raise exception 'This limited character is only on sale during its season.';
 end if;
 if exists(select 1 from public.dh_character_inventory where user_id=v_user and character_id=p_character_id) then
   raise exception 'You already collected this character.';
 end if;
 v_price:=case v_character.rarity when 'common' then 40 when 'uncommon' then 60 when 'rare' then 90 when 'epic' then 130 when 'legendary' then 180 else null end;
 if v_price is null then raise exception 'This character cannot be unlocked.'; end if;
 select count(*) into v_owned from public.dh_character_inventory where character_id=p_character_id;
 if v_owned>=v_character.total_supply then raise exception 'This character is no longer available.'; end if;
 insert into public.dh_wallets(user_id,credits) values(v_user,0) on conflict(user_id) do nothing;
 select credits into v_credits from public.dh_wallets where user_id=v_user for update;
 if v_credits<v_price then raise exception 'You need % more credits to unlock this character.',v_price-v_credits; end if;
 update public.dh_wallets set credits=credits-v_price,updated_at=now() where user_id=v_user returning credits into v_credits;
 insert into public.dh_character_inventory(user_id,character_id,source) values(v_user,p_character_id,'shop');
 update public.profiles set reward_badges=array(select distinct unnest(coalesce(reward_badges,'{}'::text[])||v_character.badge_id)) where id=v_user;
 select count(*) into v_owned from public.dh_character_inventory where character_id=p_character_id;
 insert into public.dh_credit_transactions(user_id,amount,reason) values(v_user,-v_price,'Unlocked character: '||v_character.name);
 return jsonb_build_object('character_id',v_character.id,'character_name',v_character.name,'rarity',v_character.rarity,'art_path',v_character.art_path,'badge_id',v_character.badge_id,'total_supply',v_character.total_supply,'owned_count',v_owned,'credits_remaining',v_credits,'price',v_price);
end $function$;

-- Season list for the shop: open or closed, when it ends or returns, and how much stock is left.
create or replace function public.dh_season_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'America/Los_Angeles')::date;
begin
  if (select auth.uid()) is null then raise exception 'Please sign in to view the seasonal shop.'; end if;
  return coalesce((select jsonb_agg(row_to_json(x)::jsonb order by x.sort_order) from (
    select s.season_key, s.pack_type, s.title, s.blurb, s.sort_order,
           coalesce(s.manual_open, a.auto_open) as is_open,
           s.manual_open is not null as overridden,
           case when s.manual_open is null and a.auto_open then (a.flips_on - 1) end as ends_on,
           case when s.manual_open is null and not a.auto_open then a.flips_on end as opens_on,
           case when s.manual_open is null and a.auto_open then (a.flips_on - v_today) end as days_left,
           (select count(*) from public.dh_characters c where c.pack_type = s.pack_type) as characters,
           (select coalesce(sum(greatest(c.total_supply - (select count(*) from public.dh_character_inventory i where i.character_id = c.id), 0)), 0)
              from public.dh_characters c where c.pack_type = s.pack_type) as remaining
      from public.dh_seasons s
      cross join lateral (
        select private.dh_month_in_window(extract(month from v_today)::integer, s.start_month, s.end_month) as auto_open,
               (select min(d)::date from generate_series(v_today, v_today + 500, interval '1 day') d
                 where private.dh_month_in_window(extract(month from d)::integer, s.start_month, s.end_month)
                    <> private.dh_month_in_window(extract(month from v_today)::integer, s.start_month, s.end_month)) as flips_on
      ) a
  ) x), '[]'::jsonb);
end $$;
revoke all on function public.dh_season_status() from public, anon;
grant execute on function public.dh_season_status() to authenticated;

-- Owner only: force a season open or closed (null goes back to the calendar). Logged to the audit trail.
create or replace function public.dh_set_season_override(p_season text, p_open boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.dh_staff_rank() < 4 then
    raise exception 'Only the Owner can override a season.';
  end if;
  update public.dh_seasons set manual_open = p_open where season_key = p_season;
  if not found then raise exception 'Unknown season.'; end if;
  perform private.dh_audit('shop', 'Season override: ' || p_season || ' -> ' || coalesce(p_open::text, 'calendar'), null, true, jsonb_build_object('season', p_season));
  return true;
end $$;
revoke all on function public.dh_set_season_override(text, boolean) from public, anon;
grant execute on function public.dh_set_season_override(text, boolean) to authenticated;
