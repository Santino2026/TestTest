-- 026_fix_remaining_schema_issues.sql
-- Fixes remaining schema issues identified in database audit:
-- 1. Missing schedule.status index
-- 2. Missing draft_prospects availability index
-- 3. Missing UNIQUE constraint on playoff_series
-- 4. Missing FK cascade on playoff_series.winner_id

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ADD SCHEDULE STATUS INDEX
-- Needed for game simulation queries: WHERE status = 'scheduled'
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_schedule_status ON schedule(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ADD DRAFT PROSPECTS AVAILABILITY INDEX
-- Needed for draft queries: WHERE season_id = $1 AND is_drafted = false
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_draft_prospects_available ON draft_prospects(season_id, is_drafted);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ADD UNIQUE CONSTRAINT ON PLAYOFF SERIES
-- Prevents duplicate series (e.g., two "Round 1, East, Series 1" for same season)
-- ═══════════════════════════════════════════════════════════════════════════

-- First drop any duplicate rows if they exist (keep the oldest)
DELETE FROM playoff_series a
USING playoff_series b
WHERE a.id > b.id
  AND a.season_id = b.season_id
  AND a.round = b.round
  AND COALESCE(a.conference, '') = COALESCE(b.conference, '')
  AND a.series_number = b.series_number;

-- Add unique constraint using a unique index (handles NULLs in conference)
CREATE UNIQUE INDEX IF NOT EXISTS idx_playoff_series_unique
ON playoff_series(season_id, round, COALESCE(conference, ''), series_number);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ADD FK CASCADE ON PLAYOFF SERIES WINNER
-- If team is deleted, set winner_id to NULL instead of orphaning
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE playoff_series
  DROP CONSTRAINT IF EXISTS playoff_series_winner_id_fkey;
ALTER TABLE playoff_series
  ADD CONSTRAINT playoff_series_winner_id_fkey
  FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Also add FK for higher_seed_id and lower_seed_id if not already present
ALTER TABLE playoff_series
  DROP CONSTRAINT IF EXISTS playoff_series_higher_seed_id_fkey;
ALTER TABLE playoff_series
  ADD CONSTRAINT playoff_series_higher_seed_id_fkey
  FOREIGN KEY (higher_seed_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE playoff_series
  DROP CONSTRAINT IF EXISTS playoff_series_lower_seed_id_fkey;
ALTER TABLE playoff_series
  ADD CONSTRAINT playoff_series_lower_seed_id_fkey
  FOREIGN KEY (lower_seed_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ADD PLAYOFF GAMES FK CASCADE
-- Ensure playoff_games are deleted when series or game is deleted
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE playoff_games
  DROP CONSTRAINT IF EXISTS playoff_games_series_id_fkey;
ALTER TABLE playoff_games
  ADD CONSTRAINT playoff_games_series_id_fkey
  FOREIGN KEY (series_id) REFERENCES playoff_series(id) ON DELETE CASCADE;

ALTER TABLE playoff_games
  DROP CONSTRAINT IF EXISTS playoff_games_game_id_fkey;
ALTER TABLE playoff_games
  ADD CONSTRAINT playoff_games_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
