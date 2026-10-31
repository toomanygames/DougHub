-- Kenney modular clothing, hair and footwear for the character wardrobe.
alter table public.dh_cosmetics add column if not exists art_url text;
alter table public.dh_cosmetics drop constraint if exists dh_cosmetics_category_check;
alter table public.dh_cosmetics add constraint dh_cosmetics_category_check
 check(category in ('headwear','face','neck','back','effect','hair','outfit','pants','shoes'));

insert into public.dh_cosmetics(id,name,category,rarity,price,art_key,description,art_url) values
('kenney_shirt_blue','Blue Explorer Shirt','outfit','common',45,'kenney_shirt_blue','A bright blue shirt.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shirts/Blue/blueShirt1.png'),
('kenney_shirt_green','Green Trail Shirt','outfit','common',45,'kenney_shirt_green','A green shirt.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shirts/Green/greenShirt1.png'),
('kenney_shirt_red','Red Rally Shirt','outfit','uncommon',55,'kenney_shirt_red','A bold red shirt.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shirts/Red/redShirt1.png'),
('kenney_shirt_navy','Navy Club Shirt','outfit','uncommon',55,'kenney_shirt_navy','A deep navy shirt.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shirts/Navy/navyShirt1.png'),
('kenney_shirt_white','White Classic Shirt','outfit','common',40,'kenney_shirt_white','A clean white shirt.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shirts/White/whiteShirt1.png'),
('kenney_shirt_grey','Grey Everyday Shirt','outfit','common',40,'kenney_shirt_grey','A neutral grey shirt.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shirts/Grey/greyShirt1.png'),
('kenney_shirt_pine','Pine Green Shirt','outfit','rare',80,'kenney_shirt_pine','A rich pine green shirt.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shirts/Pine/pineShirt1.png'),
('kenney_shirt_yellow','Sunny Yellow Shirt','outfit','uncommon',60,'kenney_shirt_yellow','A bright yellow shirt.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shirts/Yellow/shirtYellow1.png'),
('kenney_pants_blue','Blue Jeans','pants','common',45,'kenney_pants_blue','Classic blue trousers.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Pants/Blue%201/pantsBlue11.png'),
('kenney_pants_brown','Brown Trousers','pants','common',40,'kenney_pants_brown','Warm brown trousers.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Pants/Brown/pantsBrown1.png'),
('kenney_pants_green','Green Trousers','pants','uncommon',55,'kenney_pants_green','Forest green trousers.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Pants/Green/pantsGreen1.png'),
('kenney_pants_grey','Grey Trousers','pants','common',40,'kenney_pants_grey','Simple grey trousers.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Pants/Grey/pantsGrey1.png'),
('kenney_pants_lightblue','Sky Blue Trousers','pants','uncommon',55,'kenney_pants_lightblue','Light blue trousers.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Pants/Light%20Blue/pantsLightBlue1.png'),
('kenney_pants_navy','Navy Trousers','pants','rare',75,'kenney_pants_navy','Deep navy trousers.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Pants/Navy/pantsNavy1.png'),
('kenney_pants_pine','Pine Trousers','pants','rare',75,'kenney_pants_pine','Pine green trousers.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Pants/Pine/pantsPine1.png'),
('kenney_pants_red','Red Trousers','pants','epic',105,'kenney_pants_red','Bright red trousers.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Pants/Red/pantsRed1.png'),
('kenney_shoes_black','Black Sneakers','shoes','common',35,'kenney_shoes_black','Classic black shoes.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shoes/Black/blackShoe1.png'),
('kenney_shoes_blue','Blue Sneakers','shoes','common',35,'kenney_shoes_blue','Bright blue shoes.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shoes/Blue/blueShoe1.png'),
('kenney_shoes_brown','Brown Shoes','shoes','uncommon',45,'kenney_shoes_brown','Warm brown shoes.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shoes/Brown%201/brownShoe1.png'),
('kenney_shoes_grey','Grey Sneakers','shoes','common',35,'kenney_shoes_grey','Grey everyday shoes.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shoes/Grey/greyShoe1.png'),
('kenney_shoes_red','Red Sneakers','shoes','rare',70,'kenney_shoes_red','Red statement shoes.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shoes/Red/redShoe1.png'),
('kenney_shoes_tan','Tan Shoes','shoes','uncommon',45,'kenney_shoes_tan','Tan everyday shoes.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Shoes/Tan/tanShoe1.png'),
('kenney_hair_black','Black Fringe','hair','uncommon',65,'kenney_hair_black','A black hair style.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Hair/Black/blackMan1.png'),
('kenney_hair_blonde','Blonde Sweep','hair','rare',80,'kenney_hair_blonde','A blonde hair style.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Hair/Blonde/blondeWoman1.png'),
('kenney_hair_brown','Brown Waves','hair','uncommon',65,'kenney_hair_brown','A brown hair style.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Hair/Brown%201/brown1Woman1.png'),
('kenney_hair_red','Red Sweep','hair','epic',110,'kenney_hair_red','A red hair style.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Hair/Red/redWoman1.png'),
('kenney_hair_white','Silver Waves','hair','rare',90,'kenney_hair_white','A white hair style.','https://raw.githubusercontent.com/shorepine/kenney/main/2d/Character%20Pack/Hair/White/whiteWoman1.png')
on conflict(id) do update set art_url=excluded.art_url,category=excluded.category,price=excluded.price,description=excluded.description;

drop function if exists public.dh_get_cosmetic_catalog();
drop function if exists private.dh_get_cosmetic_catalog();
create function private.dh_get_cosmetic_catalog()
returns table(id text,name text,category text,rarity text,price integer,art_key text,description text,owned boolean,equipped boolean,art_url text)
language sql stable security definer set search_path=public,private,pg_temp as $$
 select c.id,c.name,c.category,c.rarity,c.price,c.art_key,c.description,
 exists(select 1 from public.dh_cosmetic_inventory i where i.user_id=auth.uid() and i.cosmetic_id=c.id),
 c.id=any(coalesce(l.cosmetic_ids,'{}'::text[])),c.art_url
 from public.dh_cosmetics c left join public.dh_character_loadouts l on l.user_id=auth.uid()
 order by c.category,c.rarity,c.name
$$;
revoke all on function private.dh_get_cosmetic_catalog() from public;
grant execute on function private.dh_get_cosmetic_catalog() to anon,authenticated;
create function public.dh_get_cosmetic_catalog()
returns table(id text,name text,category text,rarity text,price integer,art_key text,description text,owned boolean,equipped boolean,art_url text)
language sql stable security invoker set search_path=public,private as $$ select * from private.dh_get_cosmetic_catalog() $$;
revoke all on function public.dh_get_cosmetic_catalog() from public;
grant execute on function public.dh_get_cosmetic_catalog() to anon,authenticated;
