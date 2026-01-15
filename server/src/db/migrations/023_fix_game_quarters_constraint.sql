-- Fix missing unique constraint on game_quarters for ON CONFLICT clause
-- This constraint is required for the upsert logic in gamePersistence.ts

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'game_quarters_game_id_quarter_key'
    ) THEN
        ALTER TABLE game_quarters ADD CONSTRAINT game_quarters_game_id_quarter_key UNIQUE (game_id, quarter);
    END IF;
END $$;
