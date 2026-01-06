-- Add preseason support to schedule
-- Preseason games: 8 games before regular season (days -7 to 0)

-- Add is_preseason flag to schedule
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS is_preseason BOOLEAN DEFAULT FALSE;

-- Add offseason_phase to franchises for structured offseason flow
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS offseason_phase VARCHAR(30);

-- Add trade_deadline_day and all_star_start_day to seasons
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS trade_deadline_day INTEGER DEFAULT 100;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS all_star_start_day INTEGER DEFAULT 85;

-- Create index for preseason filtering
CREATE INDEX IF NOT EXISTS idx_schedule_preseason ON schedule(is_preseason);

-- Update comment for phase to include all valid values
COMMENT ON COLUMN franchises.phase IS 'preseason, regular_season, all_star, playoffs, offseason';
COMMENT ON COLUMN franchises.offseason_phase IS 'review, lottery, draft, free_agency, training_camp';
