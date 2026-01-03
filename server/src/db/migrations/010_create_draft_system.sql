-- 010_create_draft_system.sql
-- Draft system tables based on GAME_DESIGN.md

-- ═══════════════════════════════════════════════════════════════
-- DRAFT PICKS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 2),
  pick_number INTEGER NOT NULL CHECK (pick_number BETWEEN 1 AND 60),
  original_team_id UUID NOT NULL REFERENCES teams(id),
  current_team_id UUID NOT NULL REFERENCES teams(id),
  player_id UUID REFERENCES players(id),  -- NULL until pick is made

  -- Trade tracking
  was_traded BOOLEAN DEFAULT FALSE,
  traded_from_team_id UUID REFERENCES teams(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, round, pick_number)
);

-- ═══════════════════════════════════════════════════════════════
-- DRAFT CLASS (Prospects)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS draft_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,

  -- Basic info
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  position VARCHAR(2) NOT NULL CHECK (position IN ('PG', 'SG', 'SF', 'PF', 'C')),
  archetype VARCHAR(50) NOT NULL,
  height_inches INTEGER NOT NULL,
  weight_lbs INTEGER NOT NULL,
  age INTEGER NOT NULL DEFAULT 19,

  -- Ratings (visible after scouting)
  overall INTEGER NOT NULL CHECK (overall BETWEEN 40 AND 99),
  potential INTEGER NOT NULL CHECK (potential BETWEEN 50 AND 99),

  -- Scouting visibility (reveals more info as scouted)
  scouting_level INTEGER DEFAULT 0 CHECK (scouting_level BETWEEN 0 AND 5),
  -- 0 = Name/Position only
  -- 1 = Overall range (±10)
  -- 2 = Overall range (±5), potential range (±15)
  -- 3 = Exact overall, potential range (±10)
  -- 4 = Exact overall, potential range (±5), top traits
  -- 5 = Full info (exact potential, all traits, hidden attributes)

  -- Pre-draft rankings
  mock_draft_position INTEGER,
  big_board_rank INTEGER,

  -- Draft status
  is_drafted BOOLEAN DEFAULT FALSE,
  drafted_by_team_id UUID REFERENCES teams(id),
  draft_round INTEGER,
  draft_pick INTEGER,

  -- Hidden attributes (revealed at scouting level 5)
  peak_age INTEGER DEFAULT 27,
  durability INTEGER DEFAULT 75,
  coachability INTEGER DEFAULT 70,
  motor INTEGER DEFAULT 70,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- DRAFT PROSPECT ATTRIBUTES (Full attribute set for prospects)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS draft_prospect_attributes (
  prospect_id UUID PRIMARY KEY REFERENCES draft_prospects(id) ON DELETE CASCADE,

  -- Shooting
  inside_scoring INTEGER DEFAULT 50, close_shot INTEGER DEFAULT 50,
  mid_range INTEGER DEFAULT 50, three_point INTEGER DEFAULT 50,
  free_throw INTEGER DEFAULT 50, shot_iq INTEGER DEFAULT 50,
  offensive_consistency INTEGER DEFAULT 50,

  -- Finishing
  layup INTEGER DEFAULT 50, standing_dunk INTEGER DEFAULT 50,
  driving_dunk INTEGER DEFAULT 50, draw_foul INTEGER DEFAULT 50,
  post_moves INTEGER DEFAULT 50, post_control INTEGER DEFAULT 50,

  -- Playmaking
  ball_handling INTEGER DEFAULT 50, speed_with_ball INTEGER DEFAULT 50,
  passing_accuracy INTEGER DEFAULT 50, passing_vision INTEGER DEFAULT 50,
  passing_iq INTEGER DEFAULT 50, offensive_iq INTEGER DEFAULT 50,

  -- Defense
  interior_defense INTEGER DEFAULT 50, perimeter_defense INTEGER DEFAULT 50,
  steal INTEGER DEFAULT 50, block INTEGER DEFAULT 50,
  defensive_iq INTEGER DEFAULT 50, defensive_consistency INTEGER DEFAULT 50,
  lateral_quickness INTEGER DEFAULT 50, help_defense_iq INTEGER DEFAULT 50,

  -- Rebounding
  offensive_rebound INTEGER DEFAULT 50, defensive_rebound INTEGER DEFAULT 50,
  box_out INTEGER DEFAULT 50, rebound_timing INTEGER DEFAULT 50,

  -- Physical
  speed INTEGER DEFAULT 50, acceleration INTEGER DEFAULT 50,
  strength INTEGER DEFAULT 50, vertical INTEGER DEFAULT 50,
  stamina INTEGER DEFAULT 50, hustle INTEGER DEFAULT 50,

  -- Mental
  basketball_iq INTEGER DEFAULT 50, clutch INTEGER DEFAULT 50,
  consistency INTEGER DEFAULT 50, work_ethic INTEGER DEFAULT 50,
  aggression INTEGER DEFAULT 50, streakiness INTEGER DEFAULT 50,
  composure INTEGER DEFAULT 50
);

-- ═══════════════════════════════════════════════════════════════
-- DRAFT LOTTERY
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS draft_lottery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,

  -- Lottery odds (teams ranked 1-14 by inverse standings)
  team_id UUID NOT NULL REFERENCES teams(id),
  pre_lottery_position INTEGER NOT NULL, -- Standing (worst = 1)
  lottery_odds DECIMAL(5,2) NOT NULL,    -- Percentage chance at #1

  -- Lottery results
  post_lottery_position INTEGER,  -- Where they actually pick
  lottery_win BOOLEAN DEFAULT FALSE,  -- Did they move up?

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, team_id)
);

-- ═══════════════════════════════════════════════════════════════
-- TEAM SCOUTING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS team_scouting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  prospect_id UUID NOT NULL REFERENCES draft_prospects(id) ON DELETE CASCADE,
  scouting_level INTEGER DEFAULT 0 CHECK (scouting_level BETWEEN 0 AND 5),
  notes TEXT,
  interest_level VARCHAR(20) DEFAULT 'unknown' CHECK (interest_level IN ('unknown', 'low', 'medium', 'high', 'very_high')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, prospect_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_draft_picks_season ON draft_picks(season_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_team ON draft_picks(current_team_id);
CREATE INDEX IF NOT EXISTS idx_draft_prospects_season ON draft_prospects(season_id);
CREATE INDEX IF NOT EXISTS idx_draft_lottery_season ON draft_lottery(season_id);
CREATE INDEX IF NOT EXISTS idx_team_scouting_team ON team_scouting(team_id);
