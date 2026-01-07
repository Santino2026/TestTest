-- Add missing columns that code expects but don't exist in production

-- team_season_stats
ALTER TABLE team_season_stats ADD COLUMN IF NOT EXISTS minutes INT DEFAULT 0;

-- players table - hidden attributes that code queries directly
ALTER TABLE players ADD COLUMN IF NOT EXISTS peak_age INTEGER DEFAULT 27;
ALTER TABLE players ADD COLUMN IF NOT EXISTS work_ethic INTEGER DEFAULT 70;
ALTER TABLE players ADD COLUMN IF NOT EXISTS coachability INTEGER DEFAULT 70;
ALTER TABLE players ADD COLUMN IF NOT EXISTS durability INTEGER DEFAULT 75;

-- player_season_stats - shooting percentages
ALTER TABLE player_season_stats ADD COLUMN IF NOT EXISTS fg_pct DECIMAL(5,3) DEFAULT 0;
ALTER TABLE player_season_stats ADD COLUMN IF NOT EXISTS three_pct DECIMAL(5,3) DEFAULT 0;
ALTER TABLE player_season_stats ADD COLUMN IF NOT EXISTS ft_pct DECIMAL(5,3) DEFAULT 0;
