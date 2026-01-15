-- Fix missing unique constraint on playoff_series for ON CONFLICT clause
-- Required for saveSeries() in playoffs/engine.ts

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'playoff_series_season_round_conf_num_key'
    ) THEN
        ALTER TABLE playoff_series ADD CONSTRAINT playoff_series_season_round_conf_num_key UNIQUE (season_id, round, conference, series_number);
    END IF;
END $$;
