-- Trade Deadline Support

-- Add trade_deadline_day to seasons (default: day 100, roughly 60% through regular season)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'trade_deadline_day'
  ) THEN
    ALTER TABLE seasons ADD COLUMN trade_deadline_day INTEGER DEFAULT 100;
  END IF;
END $$;

-- Update existing seasons to have trade deadline
UPDATE seasons SET trade_deadline_day = 100 WHERE trade_deadline_day IS NULL;
