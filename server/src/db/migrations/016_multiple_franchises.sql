-- Allow multiple franchises per user
-- Each user can have multiple save files (franchises)

-- Remove the old UNIQUE(user_id) constraint that limits to one franchise per user
ALTER TABLE franchises DROP CONSTRAINT IF EXISTS franchises_user_id_key;

-- Add name column so users can identify their saves
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Add is_active column to track which franchise is currently selected
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Add constraint to ensure same user can't have two franchises with same team
ALTER TABLE franchises ADD CONSTRAINT franchises_user_team_unique UNIQUE(user_id, team_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_franchises_user_active ON franchises(user_id, is_active) WHERE is_active = TRUE;

-- Update existing franchises to have a default name and be active
UPDATE franchises
SET
  name = COALESCE(
    (SELECT city || ' ' || name FROM teams WHERE id = franchises.team_id),
    'My Franchise'
  ),
  is_active = TRUE
WHERE name IS NULL;
