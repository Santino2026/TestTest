-- Add Mid-Level Exception tracking to franchises
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS mle_used BOOLEAN DEFAULT false;

-- Add index for queries checking MLE status
CREATE INDEX IF NOT EXISTS idx_franchises_mle_used ON franchises(mle_used);
