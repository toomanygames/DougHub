-- Kenney Animal Pack Remastered sprites replace the former icon-style character art.
update public.dh_characters set name='Chick',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/chick.png' where id='cosmic_ghost';
update public.dh_characters set name='Rhino',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/rhino.png' where id='cosmic_dragon';
update public.dh_characters set name='Narwhal',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/narwhal.png' where id='cosmic_unicorn';
update public.dh_characters set name='Zebra',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/zebra.png' where id='cosmic_robot';
update public.dh_characters set name='Parrot',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/parrot.png' where id='cosmic_alien';
update public.dh_characters set name='Duck',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/duck.png' where id='ocean_crab';
update public.dh_characters set name='Penguin',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/penguin.png' where id='ocean_turtle';
update public.dh_characters set name='Whale',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/whale.png' where id='ocean_whale';
update public.dh_characters set name='Crocodile',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/crocodile.png' where id='ocean_octopus';
update public.dh_characters set name='Hippo',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/hippo.png' where id='ocean_dolphin';
update public.dh_characters set name='Rabbit',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/rabbit.png' where id='woodland_rabbit';
update public.dh_characters set name='Frog',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/frog.png' where id='woodland_frog';
update public.dh_characters set name='Bear',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/bear.png' where id='woodland_bear';
update public.dh_characters set name='Owl',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/owl.png' where id='woodland_owl';
update public.dh_characters set name='Dog',art_path='https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/dog.png' where id='woodland_fox';

insert into public.dh_characters(id,name,pack_type,rarity,rarity_weight,total_supply,art_path,badge_id) values
('kenney_buffalo','Buffalo','woodland','uncommon',1,180,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/buffalo.png','badge_kenney_buffalo'),
('kenney_chicken','Chicken','woodland','common',1,300,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/chicken.png','badge_kenney_chicken'),
('kenney_cow','Cow','woodland','common',1,300,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/cow.png','badge_kenney_cow'),
('kenney_elephant','Elephant','cosmic','epic',1,35,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/elephant.png','badge_kenney_elephant'),
('kenney_giraffe','Giraffe','cosmic','rare',1,80,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/giraffe.png','badge_kenney_giraffe'),
('kenney_goat','Goat','woodland','uncommon',1,180,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/goat.png','badge_kenney_goat'),
('kenney_gorilla','Gorilla','woodland','rare',1,80,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/gorilla.png','badge_kenney_gorilla'),
('kenney_horse','Horse','woodland','uncommon',1,180,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/horse.png','badge_kenney_horse'),
('kenney_monkey','Monkey','woodland','uncommon',1,180,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/monkey.png','badge_kenney_monkey'),
('kenney_moose','Moose','woodland','epic',1,35,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/moose.png','badge_kenney_moose'),
('kenney_panda','Panda','cosmic','rare',1,80,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/panda.png','badge_kenney_panda'),
('kenney_pig','Pig','woodland','common',1,300,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/pig.png','badge_kenney_pig'),
('kenney_sloth','Sloth','woodland','common',1,300,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/sloth.png','badge_kenney_sloth'),
('kenney_snake','Snake','ocean','rare',1,80,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/snake.png','badge_kenney_snake'),
('kenney_walrus','Walrus','ocean','legendary',1,18,'https://raw.githubusercontent.com/shorepine/kenney/main/2d/Animal%20Pack%20Remastered/Round%20%28outline%29/walrus.png','badge_kenney_walrus')
on conflict(id) do nothing;
