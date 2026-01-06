-- Create awards table for end-of-season awards
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  award_type VARCHAR(30) NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  votes INTEGER DEFAULT 0,
  stat_value DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season_id, award_type, player_id)
);

-- Index for querying awards by season
CREATE INDEX IF NOT EXISTS idx_awards_season ON awards(season_id);

-- Index for querying awards by player
CREATE INDEX IF NOT EXISTS idx_awards_player ON awards(player_id);

-- Index for querying by award type
CREATE INDEX IF NOT EXISTS idx_awards_type ON awards(award_type);

-- Award types:
-- Individual: 'mvp', 'dpoy', '6moy', 'roy', 'mip', 'fmvp'
-- All-NBA: 'all_nba_1', 'all_nba_2', 'all_nba_3'
-- All-Defensive: 'all_def_1', 'all_def_2'
-- Statistical: 'scoring_leader', 'assists_leader', 'rebounds_leader', 'steals_leader', 'blocks_leader'
