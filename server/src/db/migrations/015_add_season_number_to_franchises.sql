-- Add season_number column to franchises table
-- This tracks which season number the franchise is currently in

ALTER TABLE franchises ADD COLUMN IF NOT EXISTS season_number INTEGER DEFAULT 1;

-- Update existing franchises to have the correct season number from their current season
UPDATE franchises f
SET season_number = s.season_number
FROM seasons s
WHERE f.season_id = s.id AND f.season_number IS NULL;
