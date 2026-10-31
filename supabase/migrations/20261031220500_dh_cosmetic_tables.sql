-- Persistent cosmetic catalog, inventory, and saved character loadout.
create table if not exists public.dh_cosmetics (
 id text primary key,name text not null,category text not null check(category in ('headwear','face','neck','back','effect','hair')),
 rarity text not null check(rarity in ('common','uncommon','rare','epic','legendary')),price integer not null default 0 check(price>=0),
 art_key text not null unique,description text not null default '',created_at timestamptz not null default now()
);
create table if not exists public.dh_cosmetic_inventory (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 cosmetic_id text not null references public.dh_cosmetics(id) on delete cascade,acquired_at timestamptz not null default now(),
 source text not null default 'shop',unique(user_id,cosmetic_id)
);
create table if not exists public.dh_character_loadouts (
 user_id uuid primary key references auth.users(id) on delete cascade,character_id text not null references public.dh_characters(id),
 cosmetic_ids text[] not null default '{}',updated_at timestamptz not null default now()
);
alter table public.dh_cosmetics enable row level security;
alter table public.dh_cosmetic_inventory enable row level security;
alter table public.dh_character_loadouts enable row level security;
drop policy if exists "Cosmetics catalog is readable" on public.dh_cosmetics;
create policy "Cosmetics catalog is readable" on public.dh_cosmetics for select to anon,authenticated using(true);
drop policy if exists "Users read their own cosmetics" on public.dh_cosmetic_inventory;
create policy "Users read their own cosmetics" on public.dh_cosmetic_inventory for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Users read their own character loadout" on public.dh_character_loadouts;
create policy "Users read their own character loadout" on public.dh_character_loadouts for select to authenticated using((select auth.uid())=user_id);
grant select on public.dh_cosmetics to anon,authenticated;
grant select on public.dh_cosmetic_inventory,public.dh_character_loadouts to authenticated;

insert into public.dh_cosmetics(id,name,category,rarity,price,art_key,description) values
('cap_baseball','Baseball Cap','headwear','common',25,'cap_baseball','A classic curved cap.'),
('beanie','Cozy Beanie','headwear','common',25,'beanie','A soft winter hat.'),
('flower_crown','Flower Crown','headwear','uncommon',60,'flower_crown','A crown of bright flowers.'),
('party_hat','Party Hat','headwear','common',35,'party_hat','A colorful party cone.'),
('wizard_hat','Wizard Hat','headwear','rare',110,'wizard_hat','A starry spellcaster hat.'),
('crown_gold','Royal Crown','headwear','epic',180,'crown_gold','A shiny royal crown.'),
('pirate_hat','Pirate Hat','headwear','rare',120,'pirate_hat','A swashbuckling hat.'),
('chef_hat','Chef Hat','headwear','uncommon',75,'chef_hat','For the master chef.'),
('halo','Golden Halo','headwear','legendary',250,'halo','A glowing golden halo.'),
('headphones','Studio Headphones','headwear','uncommon',85,'headphones','Big colorful headphones.'),
('top_hat','Top Hat','headwear','rare',130,'top_hat','A fancy tall hat.'),
('rainbow_cap','Rainbow Cap','headwear','epic',170,'rainbow_cap','A bright rainbow cap.'),
('round_glasses','Round Glasses','face','common',25,'round_glasses','Simple round frames.'),
('star_glasses','Star Glasses','face','uncommon',65,'star_glasses','Star-shaped lenses.'),
('heart_glasses','Heart Glasses','face','rare',95,'heart_glasses','Heart-shaped frames.'),
('shades','Cool Shades','face','common',40,'shades','Dark sunglasses.'),
('monocle','Golden Monocle','face','epic',160,'monocle','A fancy single lens.'),
('sleep_mask','Sleepy Mask','face','uncommon',55,'sleep_mask','A cozy eye mask.'),
('freckles','Freckles','face','common',20,'freckles','A sprinkle of freckles.'),
('face_bandage','Tiny Bandage','face','common',20,'face_bandage','A little character detail.'),
('red_scarf','Red Scarf','neck','common',30,'red_scarf','A warm red scarf.'),
('blue_scarf','Ocean Scarf','neck','uncommon',55,'blue_scarf','A soft blue scarf.'),
('bowtie','Bright Bow Tie','neck','common',35,'bowtie','A neat little bow tie.'),
('gold_chain','Gold Chain','neck','rare',105,'gold_chain','A shiny necklace.'),
('flower_necklace','Flower Necklace','neck','uncommon',70,'flower_necklace','A necklace of petals.'),
('medal','Winner Medal','neck','epic',150,'medal','A medal for a champion.'),
('bell_collar','Bell Collar','neck','common',35,'bell_collar','A little bell collar.'),
('striped_tie','Striped Tie','neck','uncommon',65,'striped_tie','A colorful tie.'),
('angel_wings','Cloud Wings','back','legendary',240,'angel_wings','Soft feathered wings.'),
('dragon_wings','Dragon Wings','back','epic',190,'dragon_wings','A pair of bright dragon wings.'),
('mini_backpack','Mini Backpack','back','uncommon',90,'mini_backpack','A tiny adventure backpack.'),
('star_cape','Star Cape','back','rare',125,'star_cape','A cape with tiny stars.'),
('shell_pack','Shell Pack','back','rare',115,'shell_pack','A colorful shell backpack.'),
('jetpack','Mini Jetpack','back','epic',180,'jetpack','A compact rocket pack.'),
('sparkle_aura','Sparkle Aura','effect','rare',125,'sparkle_aura','A soft sparkle around your character.'),
('bubble_aura','Bubble Aura','effect','uncommon',85,'bubble_aura','Floating shiny bubbles.'),
('starlight_aura','Starlight Aura','effect','legendary',250,'starlight_aura','A glowing starry outline.'),
('leaf_trail','Leaf Trail','effect','common',45,'leaf_trail','A few drifting leaves.'),
('flame_aura','Warm Glow','effect','epic',175,'flame_aura','A warm, colorful glow.'),
('curly_tuft','Curly Tuft','hair','uncommon',65,'curly_tuft','A soft curl on top.'),
('spiky_tuft','Spiky Tuft','hair','common',35,'spiky_tuft','A playful spiky tuft.')
on conflict(id) do nothing;
