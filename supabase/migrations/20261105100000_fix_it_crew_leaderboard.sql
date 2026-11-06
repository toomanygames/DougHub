-- Leaderboard for Fix-It Crew. The score is the total of the member's best star ratings (3 per job, 8 jobs).
insert into public.dh_games (game_key, title, sort_dir, max_score, unit)
values ('fix-it-crew', 'Fix-It Crew: Builder Bo', 'high', 30, 'stars')
on conflict (game_key) do nothing;
