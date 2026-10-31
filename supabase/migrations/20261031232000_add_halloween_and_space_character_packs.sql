-- Add themed character packs using matching Kenney CC0 artwork and DougHub costume variants.
alter table public.dh_characters
  drop constraint if exists dh_characters_pack_type_check;
alter table public.dh_characters
  add constraint dh_characters_pack_type_check
  check (pack_type = any (array['woodland','ocean','cosmic','halloween','space']::text[]));

insert into public.dh_characters
  (id,name,pack_type,rarity,rarity_weight,total_supply,art_path,badge_id)
values
  ('spooky_pumpkin_bear','Pumpkin Bear','halloween','common',1,300,'https://doughub.online/Games/characters/halloween/pumpkin-bear.svg','badge_spooky_pumpkin_bear'),
  ('spooky_witch_frog','Witch Frog','halloween','uncommon',1,180,'https://doughub.online/Games/characters/halloween/witch-frog.svg','badge_spooky_witch_frog'),
  ('spooky_bat_owl','Bat Owl','halloween','rare',1,80,'https://doughub.online/Games/characters/halloween/bat-owl.svg','badge_spooky_bat_owl'),
  ('spooky_ghost_rabbit','Ghost Rabbit','halloween','epic',1,35,'https://doughub.online/Games/characters/halloween/ghost-rabbit.svg','badge_spooky_ghost_rabbit'),
  ('spooky_vampire_dog','Vampire Dog','halloween','legendary',1,18,'https://doughub.online/Games/characters/halloween/vampire-dog.svg','badge_spooky_vampire_dog'),
  ('space_pilot_beige','Moon Pilot','space','common',1,300,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Alien%20UFO%20Pack/shipBeige_manned.png','badge_space_pilot_beige'),
  ('space_pilot_yellow','Star Scout','space','uncommon',1,180,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Alien%20UFO%20Pack/shipYellow_manned.png','badge_space_pilot_yellow'),
  ('space_pilot_green','Galaxy Glider','space','rare',1,80,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Alien%20UFO%20Pack/shipGreen_manned.png','badge_space_pilot_green'),
  ('space_pilot_pink','Nebula Navigator','space','epic',1,35,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Alien%20UFO%20Pack/shipPink_manned.png','badge_space_pilot_pink'),
  ('space_pilot_blue','Cosmic Captain','space','legendary',1,18,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Alien%20UFO%20Pack/shipBlue_manned.png','badge_space_pilot_blue')
on conflict (id) do nothing;
