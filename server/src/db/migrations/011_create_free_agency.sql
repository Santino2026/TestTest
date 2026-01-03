-- Free Agency & Contracts System
-- Based on GAME_DESIGN.md Sections 5.3, 5.4, and 8

-- ═══════════════════════════════════════════════════════════════════════════
-- SALARY CAP SETTINGS (per season)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS salary_cap_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id),
  salary_cap BIGINT NOT NULL DEFAULT 140000000,           -- $140M soft cap
  luxury_tax_threshold BIGINT NOT NULL DEFAULT 170000000, -- $170M tax line
  first_apron BIGINT NOT NULL DEFAULT 178000000,          -- $178M first apron
  second_apron BIGINT NOT NULL DEFAULT 189000000,         -- $189M second apron
  minimum_team_salary BIGINT NOT NULL DEFAULT 126000000,  -- 90% of cap floor
  rookie_scale_factor DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- Multiplier for rookie contracts
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- CONTRACTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Core terms
  total_years INT NOT NULL CHECK (total_years BETWEEN 1 AND 5),
  years_remaining INT NOT NULL CHECK (years_remaining >= 0),
  base_salary BIGINT NOT NULL,                  -- Annual base salary

  -- Year-by-year salaries (can increase ~8% per year)
  year_1_salary BIGINT NOT NULL,
  year_2_salary BIGINT,
  year_3_salary BIGINT,
  year_4_salary BIGINT,
  year_5_salary BIGINT,

  -- Options
  player_option_year INT,                       -- Year player can opt out (1-5)
  team_option_year INT,                         -- Year team can decline
  no_trade_clause BOOLEAN DEFAULT false,

  -- Bonuses
  signing_bonus BIGINT DEFAULT 0,
  trade_bonus BIGINT DEFAULT 0,                 -- % of salary if traded (stored as amount)
  incentive_bonus BIGINT DEFAULT 0,             -- Performance incentives

  -- Contract type
  contract_type VARCHAR(30) NOT NULL DEFAULT 'standard',
  -- Types: standard, rookie_scale, veteran_minimum, mid_level, bi_annual, two_way, 10_day

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- Statuses: active, expired, bought_out, waived, traded

  signed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_season_id UUID REFERENCES seasons(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(player_id, status) -- Only one active contract per player
);

CREATE INDEX idx_contracts_player ON contracts(player_id);
CREATE INDEX idx_contracts_team ON contracts(team_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- FREE AGENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS free_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id),

  -- Type
  fa_type VARCHAR(20) NOT NULL DEFAULT 'unrestricted',
  -- Types: unrestricted (UFA), restricted (RFA)

  -- For RFA only
  rights_team_id UUID REFERENCES teams(id),

  -- Player preferences (0-100)
  money_priority INT NOT NULL DEFAULT 70,
  winning_priority INT NOT NULL DEFAULT 50,
  role_priority INT NOT NULL DEFAULT 50,
  market_size_priority INT NOT NULL DEFAULT 30,

  -- Market info
  asking_salary BIGINT NOT NULL,               -- What player expects
  market_value BIGINT NOT NULL,                -- Calculated fair value

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  -- Statuses: available, negotiating, signed, withdrawn

  became_free_agent_at TIMESTAMP DEFAULT NOW(),
  signed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(player_id, season_id)
);

CREATE INDEX idx_free_agents_season ON free_agents(season_id);
CREATE INDEX idx_free_agents_status ON free_agents(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- CONTRACT OFFERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contract_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id UUID NOT NULL REFERENCES seasons(id),

  -- Offer terms
  years INT NOT NULL CHECK (years BETWEEN 1 AND 5),
  salary_per_year BIGINT NOT NULL,
  total_value BIGINT NOT NULL,

  -- Options offered
  player_option BOOLEAN DEFAULT false,
  team_option BOOLEAN DEFAULT false,
  no_trade_clause BOOLEAN DEFAULT false,

  -- Bonuses
  signing_bonus BIGINT DEFAULT 0,
  incentive_bonus BIGINT DEFAULT 0,

  -- For RFA matching
  is_offer_sheet BOOLEAN DEFAULT false,        -- External offer to RFA
  is_matching BOOLEAN DEFAULT false,           -- Team matching offer sheet

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Statuses: pending, accepted, rejected, withdrawn, matched, expired

  offered_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,                        -- Offers expire after X days
  responded_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_offers_player ON contract_offers(player_id);
CREATE INDEX idx_offers_team ON contract_offers(team_id);
CREATE INDEX idx_offers_status ON contract_offers(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- TEAM PAYROLL VIEW
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW team_payroll AS
SELECT
  t.id as team_id,
  t.name as team_name,
  t.abbreviation,
  COUNT(c.id) as active_contracts,
  COALESCE(SUM(
    CASE c.years_remaining
      WHEN 5 THEN c.year_1_salary
      WHEN 4 THEN c.year_2_salary
      WHEN 3 THEN c.year_3_salary
      WHEN 2 THEN c.year_4_salary
      WHEN 1 THEN c.year_5_salary
      ELSE c.base_salary
    END
  ), 0) as current_payroll,
  COALESCE(SUM(
    CASE WHEN c.years_remaining >= 1 THEN c.year_1_salary ELSE 0 END +
    CASE WHEN c.years_remaining >= 2 THEN COALESCE(c.year_2_salary, 0) ELSE 0 END +
    CASE WHEN c.years_remaining >= 3 THEN COALESCE(c.year_3_salary, 0) ELSE 0 END +
    CASE WHEN c.years_remaining >= 4 THEN COALESCE(c.year_4_salary, 0) ELSE 0 END +
    CASE WHEN c.years_remaining >= 5 THEN COALESCE(c.year_5_salary, 0) ELSE 0 END
  ), 0) as total_committed
FROM teams t
LEFT JOIN contracts c ON t.id = c.team_id AND c.status = 'active'
GROUP BY t.id, t.name, t.abbreviation;

-- ═══════════════════════════════════════════════════════════════════════════
-- ADD CONTRACT REFERENCE TO PLAYERS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

-- Add salary column to players for quick access
ALTER TABLE players ADD COLUMN IF NOT EXISTS salary BIGINT DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRANSACTION LOG
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id),

  transaction_type VARCHAR(30) NOT NULL,
  -- Types: signing, release, trade, draft, waiver_claim, contract_extension

  -- Parties involved
  player_id UUID REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  other_team_id UUID REFERENCES teams(id),    -- For trades

  -- Details
  contract_id UUID REFERENCES contracts(id),
  details JSONB,                               -- Additional info

  -- Timing
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_season ON transactions(season_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
