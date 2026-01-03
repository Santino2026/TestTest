-- Advanced Statistics System
-- Tracks advanced NBA-style metrics for players and teams

-- ═══════════════════════════════════════════════════════════════════════════
-- PLAYER SEASON STATISTICS (aggregated)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS player_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id),
  team_id UUID REFERENCES teams(id),

  -- Games
  games_played INT DEFAULT 0,
  games_started INT DEFAULT 0,
  minutes INT DEFAULT 0,

  -- Basic counting stats
  points INT DEFAULT 0,
  fgm INT DEFAULT 0,
  fga INT DEFAULT 0,
  three_pm INT DEFAULT 0,
  three_pa INT DEFAULT 0,
  ftm INT DEFAULT 0,
  fta INT DEFAULT 0,
  oreb INT DEFAULT 0,
  dreb INT DEFAULT 0,
  assists INT DEFAULT 0,
  steals INT DEFAULT 0,
  blocks INT DEFAULT 0,
  turnovers INT DEFAULT 0,
  fouls INT DEFAULT 0,

  -- Advanced stats (calculated)
  per DECIMAL(5,2),                     -- Player Efficiency Rating
  true_shooting_pct DECIMAL(5,3),       -- True Shooting %
  effective_fg_pct DECIMAL(5,3),        -- Effective FG %
  usage_rate DECIMAL(5,2),              -- Usage Rate
  assist_pct DECIMAL(5,2),              -- Assist %
  rebound_pct DECIMAL(5,2),             -- Total Rebound %
  offensive_rating DECIMAL(5,1),        -- Points produced per 100 possessions
  defensive_rating DECIMAL(5,1),        -- Points allowed per 100 possessions
  net_rating DECIMAL(5,1),              -- Off Rating - Def Rating
  win_shares DECIMAL(5,2),              -- Win Shares
  box_plus_minus DECIMAL(5,2),          -- Box Plus/Minus
  value_over_replacement DECIMAL(5,2),  -- VORP

  -- Per game averages (stored for quick access)
  ppg DECIMAL(4,1),
  rpg DECIMAL(4,1),
  apg DECIMAL(4,1),
  spg DECIMAL(4,1),
  bpg DECIMAL(4,1),
  mpg DECIMAL(4,1),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(player_id, season_id)
);

CREATE INDEX idx_player_season_stats_season ON player_season_stats(season_id);
CREATE INDEX idx_player_season_stats_team ON player_season_stats(team_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PLAYER GAME STATISTICS (per game detailed)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS player_game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Status
  started BOOLEAN DEFAULT false,
  minutes INT DEFAULT 0,

  -- Shooting
  points INT DEFAULT 0,
  fgm INT DEFAULT 0,
  fga INT DEFAULT 0,
  three_pm INT DEFAULT 0,
  three_pa INT DEFAULT 0,
  ftm INT DEFAULT 0,
  fta INT DEFAULT 0,

  -- Rebounding
  oreb INT DEFAULT 0,
  dreb INT DEFAULT 0,

  -- Playmaking
  assists INT DEFAULT 0,
  turnovers INT DEFAULT 0,

  -- Defense
  steals INT DEFAULT 0,
  blocks INT DEFAULT 0,

  -- Other
  fouls INT DEFAULT 0,
  plus_minus INT DEFAULT 0,

  -- Calculated for this game
  game_score DECIMAL(5,2),              -- Game Score (Hollinger)

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(game_id, player_id)
);

CREATE INDEX idx_player_game_stats_game ON player_game_stats(game_id);
CREATE INDEX idx_player_game_stats_player ON player_game_stats(player_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- TEAM SEASON STATISTICS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS team_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id UUID NOT NULL REFERENCES seasons(id),

  -- Record
  games_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,

  -- Scoring
  points_for INT DEFAULT 0,
  points_against INT DEFAULT 0,
  avg_point_diff DECIMAL(4,1),

  -- Pace & Efficiency
  pace DECIMAL(4,1),                    -- Possessions per 48 minutes
  offensive_rating DECIMAL(5,1),        -- Points per 100 possessions
  defensive_rating DECIMAL(5,1),        -- Points allowed per 100 possessions
  net_rating DECIMAL(5,1),              -- Off - Def

  -- Shooting
  fgm INT DEFAULT 0,
  fga INT DEFAULT 0,
  fg_pct DECIMAL(4,3),
  three_pm INT DEFAULT 0,
  three_pa INT DEFAULT 0,
  three_pct DECIMAL(4,3),
  ftm INT DEFAULT 0,
  fta INT DEFAULT 0,
  ft_pct DECIMAL(4,3),
  effective_fg_pct DECIMAL(4,3),
  true_shooting_pct DECIMAL(4,3),

  -- Rebounding
  oreb INT DEFAULT 0,
  dreb INT DEFAULT 0,
  oreb_pct DECIMAL(4,3),                -- % of available offensive rebounds
  dreb_pct DECIMAL(4,3),                -- % of available defensive rebounds

  -- Other
  assists INT DEFAULT 0,
  steals INT DEFAULT 0,
  blocks INT DEFAULT 0,
  turnovers INT DEFAULT 0,
  turnover_pct DECIMAL(4,3),            -- Turnovers per 100 possessions

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(team_id, season_id)
);

CREATE INDEX idx_team_season_stats_season ON team_season_stats(season_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- LEAGUE LEADERS VIEW
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW league_leaders AS
SELECT
  pss.player_id,
  p.first_name || ' ' || p.last_name as player_name,
  t.abbreviation as team,
  p.position,
  pss.games_played,
  pss.ppg,
  pss.rpg,
  pss.apg,
  pss.spg,
  pss.bpg,
  pss.per,
  pss.true_shooting_pct,
  pss.win_shares,
  pss.box_plus_minus
FROM player_season_stats pss
JOIN players p ON pss.player_id = p.id
LEFT JOIN teams t ON pss.team_id = t.id
WHERE pss.games_played >= 10;  -- Minimum games qualifier

-- ═══════════════════════════════════════════════════════════════════════════
-- CAREER STATISTICS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS player_career_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Totals
  seasons INT DEFAULT 0,
  games_played INT DEFAULT 0,
  games_started INT DEFAULT 0,
  minutes INT DEFAULT 0,
  points INT DEFAULT 0,
  rebounds INT DEFAULT 0,
  assists INT DEFAULT 0,
  steals INT DEFAULT 0,
  blocks INT DEFAULT 0,

  -- Career averages
  career_ppg DECIMAL(4,1),
  career_rpg DECIMAL(4,1),
  career_apg DECIMAL(4,1),

  -- Career advanced
  career_per DECIMAL(5,2),
  career_win_shares DECIMAL(5,2),

  -- Achievements
  all_star_appearances INT DEFAULT 0,
  all_nba_selections INT DEFAULT 0,
  championships INT DEFAULT 0,
  mvp_awards INT DEFAULT 0,
  finals_mvp_awards INT DEFAULT 0,

  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(player_id)
);

CREATE INDEX idx_career_stats_player ON player_career_stats(player_id);
