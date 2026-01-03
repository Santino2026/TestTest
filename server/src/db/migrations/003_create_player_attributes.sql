-- 003_create_player_attributes.sql
-- All 42 player attributes (0-99 scale)

CREATE TABLE IF NOT EXISTS player_attributes (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,

  -- Scoring (10)
  inside_scoring INTEGER NOT NULL CHECK (inside_scoring BETWEEN 0 AND 99),
  mid_range INTEGER NOT NULL CHECK (mid_range BETWEEN 0 AND 99),
  three_point INTEGER NOT NULL CHECK (three_point BETWEEN 0 AND 99),
  free_throw INTEGER NOT NULL CHECK (free_throw BETWEEN 0 AND 99),
  shot_iq INTEGER NOT NULL CHECK (shot_iq BETWEEN 0 AND 99),
  offensive_consistency INTEGER NOT NULL CHECK (offensive_consistency BETWEEN 0 AND 99),

  -- Finishing
  layup INTEGER NOT NULL CHECK (layup BETWEEN 0 AND 99),
  standing_dunk INTEGER NOT NULL CHECK (standing_dunk BETWEEN 0 AND 99),
  driving_dunk INTEGER NOT NULL CHECK (driving_dunk BETWEEN 0 AND 99),
  draw_foul INTEGER NOT NULL CHECK (draw_foul BETWEEN 0 AND 99),
  post_moves INTEGER NOT NULL CHECK (post_moves BETWEEN 0 AND 99),

  -- Playmaking
  ball_handling INTEGER NOT NULL CHECK (ball_handling BETWEEN 0 AND 99),
  passing_accuracy INTEGER NOT NULL CHECK (passing_accuracy BETWEEN 0 AND 99),
  passing_vision INTEGER NOT NULL CHECK (passing_vision BETWEEN 0 AND 99),
  passing_iq INTEGER NOT NULL CHECK (passing_iq BETWEEN 0 AND 99),

  -- Defense
  interior_defense INTEGER NOT NULL CHECK (interior_defense BETWEEN 0 AND 99),
  perimeter_defense INTEGER NOT NULL CHECK (perimeter_defense BETWEEN 0 AND 99),
  steal INTEGER NOT NULL CHECK (steal BETWEEN 0 AND 99),
  block INTEGER NOT NULL CHECK (block BETWEEN 0 AND 99),
  defensive_iq INTEGER NOT NULL CHECK (defensive_iq BETWEEN 0 AND 99),
  defensive_consistency INTEGER NOT NULL CHECK (defensive_consistency BETWEEN 0 AND 99),

  -- Rebounding
  offensive_rebound INTEGER NOT NULL CHECK (offensive_rebound BETWEEN 0 AND 99),
  defensive_rebound INTEGER NOT NULL CHECK (defensive_rebound BETWEEN 0 AND 99),

  -- Physical
  speed INTEGER NOT NULL CHECK (speed BETWEEN 0 AND 99),
  acceleration INTEGER NOT NULL CHECK (acceleration BETWEEN 0 AND 99),
  strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 99),
  vertical INTEGER NOT NULL CHECK (vertical BETWEEN 0 AND 99),
  stamina INTEGER NOT NULL CHECK (stamina BETWEEN 0 AND 99),
  hustle INTEGER NOT NULL CHECK (hustle BETWEEN 0 AND 99),

  -- Mental
  basketball_iq INTEGER NOT NULL CHECK (basketball_iq BETWEEN 0 AND 99),
  clutch INTEGER NOT NULL CHECK (clutch BETWEEN 0 AND 99),
  consistency INTEGER NOT NULL CHECK (consistency BETWEEN 0 AND 99),
  work_ethic INTEGER NOT NULL CHECK (work_ethic BETWEEN 0 AND 99),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
