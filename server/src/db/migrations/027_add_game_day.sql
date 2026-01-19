-- Add game_day column for sequencing games into logical simulation days
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS game_day INTEGER;
CREATE INDEX IF NOT EXISTS idx_schedule_game_day ON schedule(game_day);
