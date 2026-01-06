-- All-Star Weekend Tables

-- All-Star player selections (15 per conference)
CREATE TABLE IF NOT EXISTS all_star_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  player_id UUID NOT NULL REFERENCES players(id),
  conference VARCHAR(10) NOT NULL CHECK (conference IN ('east', 'west')),
  is_starter BOOLEAN DEFAULT FALSE,
  is_captain BOOLEAN DEFAULT FALSE,
  votes INTEGER DEFAULT 0,
  fan_votes INTEGER DEFAULT 0,
  player_votes INTEGER DEFAULT 0,
  media_votes INTEGER DEFAULT 0,
  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, player_id)
);

-- All-Star event results
CREATE TABLE IF NOT EXISTS all_star_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('rising_stars', 'skills', 'three_point', 'dunk', 'game')),
  winner_id UUID REFERENCES players(id),
  runner_up_id UUID REFERENCES players(id),
  mvp_id UUID REFERENCES players(id),
  winning_team VARCHAR(20), -- For team events: 'team_lebron', 'team_giannis', 'rookies', 'sophomores'
  winning_score INTEGER,
  losing_score INTEGER,
  details JSONB, -- Store event-specific data (round scores, dunk ratings, etc.)
  simulated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, event_type)
);

-- All-Star event participants (for individual events)
CREATE TABLE IF NOT EXISTS all_star_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id),
  seed INTEGER, -- Seeding for bracket events
  score NUMERIC(6,2), -- Final score/rating
  is_eliminated BOOLEAN DEFAULT FALSE,
  round_reached INTEGER DEFAULT 1, -- How far they got
  details JSONB, -- Round-by-round performance
  UNIQUE(season_id, event_type, player_id)
);

-- Add all_star_start_day to seasons if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'all_star_day'
  ) THEN
    ALTER TABLE seasons ADD COLUMN all_star_day INTEGER DEFAULT 85;
  END IF;
END $$;

-- Add all_star_complete flag to franchises
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'franchises' AND column_name = 'all_star_complete'
  ) THEN
    ALTER TABLE franchises ADD COLUMN all_star_complete BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_all_star_selections_season ON all_star_selections(season_id);
CREATE INDEX IF NOT EXISTS idx_all_star_selections_player ON all_star_selections(player_id);
CREATE INDEX IF NOT EXISTS idx_all_star_events_season ON all_star_events(season_id);
CREATE INDEX IF NOT EXISTS idx_all_star_participants_season ON all_star_event_participants(season_id, event_type);
