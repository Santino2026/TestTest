-- Add preseason record tracking to franchises
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS preseason_wins INTEGER DEFAULT 0;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS preseason_losses INTEGER DEFAULT 0;
