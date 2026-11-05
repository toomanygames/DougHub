-- Leaderboard for Bundt Bakery. The score is the member's lifetime total of cake stars (max 5 per cake).
insert into public.dh_games (game_key, title, sort_dir, max_score, unit)
values ('bundt-bakery', 'Bundt Bakery', 'high', 1000000, 'stars')
on conflict (game_key) do nothing;
