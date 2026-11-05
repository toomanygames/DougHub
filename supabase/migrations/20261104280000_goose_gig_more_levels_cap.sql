-- Honk & Roll now has 13 levels. A perfect run of every level totals about 190,000 points,
-- so the leaderboard cap (it was 150,000 for 5 levels) is raised with headroom.
update public.dh_games set max_score = 500000 where game_key = 'goose-gig';
