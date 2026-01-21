-- Backfill assists for games that were simulated before assist tracking was deployed
-- This generates realistic assist values based on player position and their passing_iq attribute
-- NOTE: This migration was manually applied on 2026-01-21

-- First, update player_game_stats with realistic per-game assists
-- PG: 5-9 assists based on passing_iq, SG: 2-5, SF: 2-4, PF: 1-3, C: 1-3
UPDATE player_game_stats pgs
SET assists = CASE
    WHEN p.position = 'PG' THEN GREATEST(3, LEAST(12, ROUND(
        (4 + (pa.passing_iq / 99.0) * 6 + RANDOM() * 3 - 1)::numeric, 0
    )))
    WHEN p.position = 'SG' THEN GREATEST(1, LEAST(8, ROUND(
        (2 + (pa.passing_iq / 99.0) * 4 + RANDOM() * 2 - 1)::numeric, 0
    )))
    WHEN p.position = 'SF' THEN GREATEST(1, LEAST(6, ROUND(
        (1.5 + (pa.passing_iq / 99.0) * 3 + RANDOM() * 2 - 1)::numeric, 0
    )))
    WHEN p.position = 'PF' THEN GREATEST(0, LEAST(5, ROUND(
        (1 + (pa.passing_iq / 99.0) * 2.5 + RANDOM() * 1.5 - 0.5)::numeric, 0
    )))
    WHEN p.position = 'C' THEN GREATEST(0, LEAST(5, ROUND(
        (0.5 + (pa.passing_iq / 99.0) * 2.5 + RANDOM() * 1.5 - 0.5)::numeric, 0
    )))
    ELSE GREATEST(0, ROUND((1 + RANDOM() * 3)::numeric, 0))
END
FROM players p
JOIN player_attributes pa ON pa.player_id = p.id
WHERE pgs.player_id = p.id
  AND pgs.assists = 0
  AND pgs.minutes > 0;

-- Now recalculate player_season_stats.assists from the updated player_game_stats
UPDATE player_season_stats pss
SET assists = subq.total_assists
FROM (
    SELECT player_id, season_id, SUM(assists) as total_assists
    FROM player_game_stats pgs
    JOIN games g ON pgs.game_id = g.id
    GROUP BY player_id, season_id
) subq
WHERE pss.player_id = subq.player_id
  AND pss.season_id = subq.season_id;

-- Update the per-game averages (apg)
UPDATE player_season_stats
SET apg = CASE
    WHEN games_played > 0 THEN ROUND((assists::float / games_played)::numeric, 1)
    ELSE 0
END
WHERE assists > 0 OR apg = 0;
