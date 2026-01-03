-- 002_create_players.sql
-- Players table with basic info

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  position VARCHAR(2) NOT NULL CHECK (position IN ('PG', 'SG', 'SF', 'PF', 'C')),
  secondary_position VARCHAR(2) CHECK (secondary_position IN ('PG', 'SG', 'SF', 'PF', 'C')),
  archetype VARCHAR(20) NOT NULL,
  height_inches INTEGER NOT NULL CHECK (height_inches BETWEEN 66 AND 90),
  weight_lbs INTEGER NOT NULL CHECK (weight_lbs BETWEEN 150 AND 350),
  age INTEGER NOT NULL CHECK (age BETWEEN 18 AND 45),
  jersey_number INTEGER CHECK (jersey_number BETWEEN 0 AND 99),
  years_pro INTEGER DEFAULT 0,
  overall INTEGER NOT NULL CHECK (overall BETWEEN 40 AND 99),
  potential INTEGER NOT NULL CHECK (potential BETWEEN 40 AND 99),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_players_overall ON players(overall DESC);
