-- 009_add_missing_attributes.sql
-- Add missing attributes from GAME_DESIGN.md Section 4.2

-- ═══════════════════════════════════════════════════════════════
-- VISIBLE ATTRIBUTES (added to player_attributes)
-- ═══════════════════════════════════════════════════════════════

-- Shooting
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS close_shot INTEGER DEFAULT 50 CHECK (close_shot BETWEEN 0 AND 99);

-- Finishing
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS post_control INTEGER DEFAULT 50 CHECK (post_control BETWEEN 0 AND 99);

-- Playmaking
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS speed_with_ball INTEGER DEFAULT 50 CHECK (speed_with_ball BETWEEN 0 AND 99);
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS offensive_iq INTEGER DEFAULT 50 CHECK (offensive_iq BETWEEN 0 AND 99);

-- Defense
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS lateral_quickness INTEGER DEFAULT 50 CHECK (lateral_quickness BETWEEN 0 AND 99);
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS help_defense_iq INTEGER DEFAULT 50 CHECK (help_defense_iq BETWEEN 0 AND 99);

-- Rebounding
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS box_out INTEGER DEFAULT 50 CHECK (box_out BETWEEN 0 AND 99);
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS rebound_timing INTEGER DEFAULT 50 CHECK (rebound_timing BETWEEN 0 AND 99);

-- Mental/Intangibles (THE GAME CHANGERS from GDD)
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS aggression INTEGER DEFAULT 50 CHECK (aggression BETWEEN 0 AND 99);
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS streakiness INTEGER DEFAULT 50 CHECK (streakiness BETWEEN 0 AND 99);
ALTER TABLE player_attributes ADD COLUMN IF NOT EXISTS composure INTEGER DEFAULT 50 CHECK (composure BETWEEN 0 AND 99);

-- ═══════════════════════════════════════════════════════════════
-- HIDDEN ATTRIBUTES (added to players table)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE players ADD COLUMN IF NOT EXISTS peak_age INTEGER DEFAULT 27 CHECK (peak_age BETWEEN 24 AND 33);
ALTER TABLE players ADD COLUMN IF NOT EXISTS durability INTEGER DEFAULT 75 CHECK (durability BETWEEN 40 AND 99);
ALTER TABLE players ADD COLUMN IF NOT EXISTS coachability INTEGER DEFAULT 70 CHECK (coachability BETWEEN 40 AND 99);
ALTER TABLE players ADD COLUMN IF NOT EXISTS greed INTEGER DEFAULT 50 CHECK (greed BETWEEN 0 AND 100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS ego INTEGER DEFAULT 50 CHECK (ego BETWEEN 0 AND 100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS loyalty INTEGER DEFAULT 50 CHECK (loyalty BETWEEN 0 AND 100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS leadership INTEGER DEFAULT 50 CHECK (leadership BETWEEN 0 AND 100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS motor INTEGER DEFAULT 70 CHECK (motor BETWEEN 40 AND 99);

-- ═══════════════════════════════════════════════════════════════
-- HOT/COLD STATE TRACKING (for streakiness system)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS player_game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Hot/Cold state tracking
  hot_cold_state VARCHAR(20) DEFAULT 'normal' CHECK (hot_cold_state IN ('ice_cold', 'cold', 'normal', 'warm', 'hot', 'on_fire')),
  consecutive_makes INTEGER DEFAULT 0,
  consecutive_misses INTEGER DEFAULT 0,
  state_modifier DECIMAL(4,2) DEFAULT 0.00,

  -- Track when state changed
  last_state_change_quarter INTEGER DEFAULT 1,
  times_caught_fire INTEGER DEFAULT 0,
  times_went_cold INTEGER DEFAULT 0,

  UNIQUE(game_id, player_id)
);

-- Index for quick lookups during simulation
CREATE INDEX IF NOT EXISTS idx_player_game_state_lookup ON player_game_state(game_id, player_id);
