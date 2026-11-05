-- Leaderboard for Honk & Roll: The Goose Gig. The score is the sum of a member's best score on each of the 5 levels.
-- Level scores top out well under 20,000, so 5 levels cannot exceed 100,000; the cap leaves room to grow.
insert into public.dh_games (game_key, title, sort_dir, max_score, unit)
values ('goose-gig', 'Honk & Roll: The Goose Gig', 'high', 150000, 'points')
on conflict (game_key) do nothing;
