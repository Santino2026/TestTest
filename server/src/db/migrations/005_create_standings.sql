-- 005_create_standings.sql
-- Season standings tracking

CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  season_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'preseason' CHECK (status IN ('preseason', 'regular', 'playoffs', 'offseason', 'completed')),
  current_day INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS standings (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  home_wins INTEGER DEFAULT 0,
  home_losses INTEGER DEFAULT 0,
  away_wins INTEGER DEFAULT 0,
  away_losses INTEGER DEFAULT 0,
  conference_wins INTEGER DEFAULT 0,
  conference_losses INTEGER DEFAULT 0,
  division_wins INTEGER DEFAULT 0,
  division_losses INTEGER DEFAULT 0,
  points_for INTEGER DEFAULT 0,
  points_against INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_10_wins INTEGER DEFAULT 0,
  UNIQUE(season_id, team_id)
);

CREATE INDEX idx_standings_season ON standings(season_id);
CREATE INDEX idx_standings_team ON standings(team_id);
