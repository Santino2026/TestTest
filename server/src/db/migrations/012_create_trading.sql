-- Trading System
-- Based on GAME_DESIGN.md Section 9

-- ═══════════════════════════════════════════════════════════════════════════
-- TRADE PROPOSALS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trade_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id),

  -- Teams involved (2-3 teams)
  team_ids UUID[] NOT NULL,                  -- Array of team IDs
  proposed_by_team_id UUID NOT NULL REFERENCES teams(id),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Statuses: pending, accepted, rejected, countered, expired, cancelled

  -- Validation
  is_valid BOOLEAN NOT NULL DEFAULT false,
  validation_errors TEXT[],

  -- Summary for display
  summary TEXT,

  -- Timestamps
  proposed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '48 hours',
  resolved_at TIMESTAMP,

  -- Counter offer reference
  counter_to_id UUID REFERENCES trade_proposals(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trade_proposals_status ON trade_proposals(status);
CREATE INDEX idx_trade_proposals_team ON trade_proposals USING GIN(team_ids);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRADE ASSETS (players and picks being traded)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trade_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,

  -- Which team is sending/receiving
  from_team_id UUID NOT NULL REFERENCES teams(id),
  to_team_id UUID NOT NULL REFERENCES teams(id),

  -- Asset type
  asset_type VARCHAR(20) NOT NULL,
  -- Types: player, draft_pick, cash

  -- For players
  player_id UUID REFERENCES players(id),

  -- For draft picks
  pick_year INT,
  pick_round INT,
  pick_original_team_id UUID REFERENCES teams(id),  -- Original owner of pick
  is_pick_swap BOOLEAN DEFAULT false,

  -- For cash
  cash_amount BIGINT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trade_assets_trade ON trade_assets(trade_id);
CREATE INDEX idx_trade_assets_player ON trade_assets(player_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- EXECUTED TRADES (history)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS executed_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_proposal_id UUID NOT NULL REFERENCES trade_proposals(id),
  season_id UUID NOT NULL REFERENCES seasons(id),

  -- Snapshot of what was traded
  details JSONB NOT NULL,

  executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_executed_trades_season ON executed_trades(season_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- DRAFT PICKS OWNERSHIP TRACKING
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS draft_pick_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year INT NOT NULL,                  -- The draft year
  round INT NOT NULL CHECK (round IN (1, 2)),
  original_team_id UUID NOT NULL REFERENCES teams(id),
  current_owner_id UUID NOT NULL REFERENCES teams(id),

  -- Pick swap info
  is_swapped BOOLEAN DEFAULT false,
  swap_with_team_id UUID REFERENCES teams(id),

  -- Protections (e.g., "top 10 protected")
  is_protected BOOLEAN DEFAULT false,
  protection_conditions TEXT,

  -- Status
  is_used BOOLEAN DEFAULT false,            -- Has this pick been made
  player_selected_id UUID REFERENCES players(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(season_year, round, original_team_id)
);

CREATE INDEX idx_pick_ownership_owner ON draft_pick_ownership(current_owner_id);
CREATE INDEX idx_pick_ownership_year ON draft_pick_ownership(season_year);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRADE RESTRICTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Track when players can be traded (newly signed players have restriction)
ALTER TABLE players ADD COLUMN IF NOT EXISTS tradeable_after DATE;

-- Track last trade date (can't retrade within 30 days)
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_traded_at TIMESTAMP;
