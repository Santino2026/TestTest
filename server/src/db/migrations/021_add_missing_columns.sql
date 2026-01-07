-- Add missing columns that code expects but don't exist in production

-- Add minutes column to team_season_stats
ALTER TABLE team_season_stats ADD COLUMN IF NOT EXISTS minutes INT DEFAULT 0;

-- Add peak_age to players (if not exists from migration 009)
ALTER TABLE players ADD COLUMN IF NOT EXISTS peak_age INTEGER DEFAULT 27;

-- Add shooting percentage columns to player_season_stats
ALTER TABLE player_season_stats ADD COLUMN IF NOT EXISTS fg_pct DECIMAL(5,3) DEFAULT 0;
ALTER TABLE player_season_stats ADD COLUMN IF NOT EXISTS three_pct DECIMAL(5,3) DEFAULT 0;
ALTER TABLE player_season_stats ADD COLUMN IF NOT EXISTS ft_pct DECIMAL(5,3) DEFAULT 0;
