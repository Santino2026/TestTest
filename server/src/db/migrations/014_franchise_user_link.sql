-- Link franchises to users
-- Allow same team to be managed by different users

-- Drop the old unique constraint on team_id
ALTER TABLE franchises DROP CONSTRAINT IF EXISTS franchises_team_id_key;

-- Add unique constraint on user_id (one franchise per user)
ALTER TABLE franchises ADD CONSTRAINT franchises_user_id_key UNIQUE(user_id);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_franchise_user ON franchises(user_id);

-- Add reference to users table (if users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE franchises
        ADD CONSTRAINT fk_franchise_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
