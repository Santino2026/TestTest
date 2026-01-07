-- Add missing columns that code expects but don't exist in production

-- Add minutes column to team_season_stats
ALTER TABLE team_season_stats ADD COLUMN IF NOT EXISTS minutes INT DEFAULT 0;

-- Add peak_age to players (if not exists from migration 009)
ALTER TABLE players ADD COLUMN IF NOT EXISTS peak_age INTEGER DEFAULT 27;
