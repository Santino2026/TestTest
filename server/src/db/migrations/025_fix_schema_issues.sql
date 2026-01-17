-- 025_fix_schema_issues.sql
-- Fixes critical schema issues identified in database audit:
-- 1. season_id type mismatches (UUID vs INTEGER)
-- 2. Missing ON DELETE rules on foreign keys
-- 3. Missing indexes for frequently queried columns
-- 4. Missing NOT NULL constraints

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. FIX SEASON_ID TYPE MISMATCHES
-- seasons.id is SERIAL (INTEGER), but some tables declared season_id as UUID
-- ═══════════════════════════════════════════════════════════════════════════

-- Fix draft_picks.season_id (UUID → INTEGER)
ALTER TABLE draft_picks
  DROP CONSTRAINT IF EXISTS draft_picks_season_id_fkey;
ALTER TABLE draft_picks
  ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
ALTER TABLE draft_picks
  ADD CONSTRAINT draft_picks_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- Fix draft_prospects.season_id (UUID → INTEGER)
ALTER TABLE draft_prospects
  DROP CONSTRAINT IF EXISTS draft_prospects_season_id_fkey;
ALTER TABLE draft_prospects
  ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
ALTER TABLE draft_prospects
  ADD CONSTRAINT draft_prospects_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- Fix draft_lottery.season_id (UUID → INTEGER)
ALTER TABLE draft_lottery
  DROP CONSTRAINT IF EXISTS draft_lottery_season_id_fkey;
ALTER TABLE draft_lottery
  ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
ALTER TABLE draft_lottery
  ADD CONSTRAINT draft_lottery_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- Fix salary_cap_settings.season_id (UUID → INTEGER)
ALTER TABLE salary_cap_settings
  DROP CONSTRAINT IF EXISTS salary_cap_settings_season_id_fkey;
ALTER TABLE salary_cap_settings
  ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
ALTER TABLE salary_cap_settings
  ADD CONSTRAINT salary_cap_settings_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- Fix free_agents.season_id (UUID → INTEGER)
ALTER TABLE free_agents
  DROP CONSTRAINT IF EXISTS free_agents_season_id_fkey;
ALTER TABLE free_agents
  ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
ALTER TABLE free_agents
  ADD CONSTRAINT free_agents_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- Fix contracts.start_season_id (UUID → INTEGER)
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_start_season_id_fkey;
ALTER TABLE contracts
  ALTER COLUMN start_season_id TYPE INTEGER USING start_season_id::text::integer;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_start_season_id_fkey
  FOREIGN KEY (start_season_id) REFERENCES seasons(id) ON DELETE SET NULL;

-- Fix contract_offers.season_id (UUID → INTEGER)
ALTER TABLE contract_offers
  DROP CONSTRAINT IF EXISTS contract_offers_season_id_fkey;
ALTER TABLE contract_offers
  ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
ALTER TABLE contract_offers
  ADD CONSTRAINT contract_offers_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- Fix transactions.season_id (UUID → INTEGER)
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_season_id_fkey;
ALTER TABLE transactions
  ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ADD MISSING ON DELETE RULES
-- ═══════════════════════════════════════════════════════════════════════════

-- games table - add ON DELETE CASCADE for season
ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_season_id_fkey;
ALTER TABLE games
  ADD CONSTRAINT games_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

-- contracts.team_id - add ON DELETE CASCADE
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_team_id_fkey;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- draft_picks - add ON DELETE CASCADE for team refs
ALTER TABLE draft_picks
  DROP CONSTRAINT IF EXISTS draft_picks_original_team_id_fkey;
ALTER TABLE draft_picks
  ADD CONSTRAINT draft_picks_original_team_id_fkey
  FOREIGN KEY (original_team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE draft_picks
  DROP CONSTRAINT IF EXISTS draft_picks_current_team_id_fkey;
ALTER TABLE draft_picks
  ADD CONSTRAINT draft_picks_current_team_id_fkey
  FOREIGN KEY (current_team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE draft_picks
  DROP CONSTRAINT IF EXISTS draft_picks_traded_from_team_id_fkey;
ALTER TABLE draft_picks
  ADD CONSTRAINT draft_picks_traded_from_team_id_fkey
  FOREIGN KEY (traded_from_team_id) REFERENCES teams(id) ON DELETE SET NULL;

ALTER TABLE draft_picks
  DROP CONSTRAINT IF EXISTS draft_picks_player_id_fkey;
ALTER TABLE draft_picks
  ADD CONSTRAINT draft_picks_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;

-- draft_prospects - add ON DELETE SET NULL for drafted_by_team_id
ALTER TABLE draft_prospects
  DROP CONSTRAINT IF EXISTS draft_prospects_drafted_by_team_id_fkey;
ALTER TABLE draft_prospects
  ADD CONSTRAINT draft_prospects_drafted_by_team_id_fkey
  FOREIGN KEY (drafted_by_team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- draft_lottery - add ON DELETE CASCADE for team
ALTER TABLE draft_lottery
  DROP CONSTRAINT IF EXISTS draft_lottery_team_id_fkey;
ALTER TABLE draft_lottery
  ADD CONSTRAINT draft_lottery_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- team_scouting - add ON DELETE CASCADE for team
ALTER TABLE team_scouting
  DROP CONSTRAINT IF EXISTS team_scouting_team_id_fkey;
ALTER TABLE team_scouting
  ADD CONSTRAINT team_scouting_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- free_agents.rights_team_id - add ON DELETE SET NULL
ALTER TABLE free_agents
  DROP CONSTRAINT IF EXISTS free_agents_rights_team_id_fkey;
ALTER TABLE free_agents
  ADD CONSTRAINT free_agents_rights_team_id_fkey
  FOREIGN KEY (rights_team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- contract_offers - add ON DELETE CASCADE for team
ALTER TABLE contract_offers
  DROP CONSTRAINT IF EXISTS contract_offers_team_id_fkey;
ALTER TABLE contract_offers
  ADD CONSTRAINT contract_offers_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- transactions - add ON DELETE SET NULL for optional refs
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_player_id_fkey;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_team_id_fkey;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_other_team_id_fkey;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_other_team_id_fkey
  FOREIGN KEY (other_team_id) REFERENCES teams(id) ON DELETE SET NULL;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_contract_id_fkey;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ADD MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- games.status - frequently filtered
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- plays.team_id - for team play lookups
CREATE INDEX IF NOT EXISTS idx_plays_team ON plays(team_id);

-- players.archetype - used in filtering
CREATE INDEX IF NOT EXISTS idx_players_archetype ON players(archetype);

-- draft_prospects.scouting_level - filtered in queries
CREATE INDEX IF NOT EXISTS idx_draft_prospects_scouting ON draft_prospects(scouting_level);

-- draft_picks.player_id - queried for drafted status
CREATE INDEX IF NOT EXISTS idx_draft_picks_player ON draft_picks(player_id);

-- team_game_stats.team_id - for team stat lookups
CREATE INDEX IF NOT EXISTS idx_team_game_stats_team ON team_game_stats(team_id);

-- trade_assets.trade_id - for trade asset lookups (N+1 fix support)
CREATE INDEX IF NOT EXISTS idx_trade_assets_trade_id ON trade_assets(trade_id);

-- player_season_stats composite - for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_player_season_stats_season_team
  ON player_season_stats(season_id, team_id);

-- contracts composite - for salary cap checks
CREATE INDEX IF NOT EXISTS idx_contracts_team_status ON contracts(team_id, status);

-- free_agents composite - for free agency lookups
CREATE INDEX IF NOT EXISTS idx_free_agents_player_season ON free_agents(player_id, season_id);

-- standings composite - for standings queries
CREATE INDEX IF NOT EXISTS idx_standings_season_team ON standings(season_id, team_id);

-- playoff_series composite - for bracket lookups
CREATE INDEX IF NOT EXISTS idx_playoff_series_season_round ON playoff_series(season_id, round);

-- schedule composite - for schedule filtering
CREATE INDEX IF NOT EXISTS idx_schedule_season_team ON schedule(season_id, team_id);

-- traits.category - for trait filtering
CREATE INDEX IF NOT EXISTS idx_traits_category ON traits(category);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ADD MISSING NOT NULL CONSTRAINTS (where safe)
-- ═══════════════════════════════════════════════════════════════════════════

-- games.season_id should be NOT NULL for proper game tracking
-- Only update if there's existing data that needs fixing first
UPDATE games SET season_id = (SELECT id FROM seasons ORDER BY id DESC LIMIT 1)
  WHERE season_id IS NULL;
ALTER TABLE games ALTER COLUMN season_id SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ADD CHECK CONSTRAINT FOR LOTTERY ODDS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE draft_lottery
  DROP CONSTRAINT IF EXISTS draft_lottery_odds_check;
ALTER TABLE draft_lottery
  ADD CONSTRAINT draft_lottery_odds_check
  CHECK (lottery_odds >= 0 AND lottery_odds <= 100);
