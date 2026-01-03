-- 001_create_teams.sql
-- Teams table for all 30 NBA-style franchises

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  abbreviation VARCHAR(3) NOT NULL UNIQUE,
  conference VARCHAR(10) NOT NULL CHECK (conference IN ('Eastern', 'Western')),
  division VARCHAR(15) NOT NULL CHECK (division IN ('Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest')),
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  arena_name VARCHAR(100) NOT NULL,
  championships INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_conference ON teams(conference);
CREATE INDEX idx_teams_division ON teams(division);
