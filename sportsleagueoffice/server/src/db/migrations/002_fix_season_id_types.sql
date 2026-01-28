-- Fix remaining season_id columns that were incorrectly typed as UUID
-- These should be INTEGER to match seasons.id (SERIAL PRIMARY KEY)

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_season_stats' AND column_name = 'season_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE player_season_stats DROP CONSTRAINT IF EXISTS player_season_stats_season_id_fkey;
    ALTER TABLE player_season_stats ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
    ALTER TABLE player_season_stats ADD CONSTRAINT player_season_stats_season_id_fkey FOREIGN KEY (season_id) REFERENCES seasons(id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_season_stats' AND column_name = 'season_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE team_season_stats DROP CONSTRAINT IF EXISTS team_season_stats_season_id_fkey;
    ALTER TABLE team_season_stats ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
    ALTER TABLE team_season_stats ADD CONSTRAINT team_season_stats_season_id_fkey FOREIGN KEY (season_id) REFERENCES seasons(id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trade_proposals' AND column_name = 'season_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE trade_proposals DROP CONSTRAINT IF EXISTS trade_proposals_season_id_fkey;
    ALTER TABLE trade_proposals ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
    ALTER TABLE trade_proposals ADD CONSTRAINT trade_proposals_season_id_fkey FOREIGN KEY (season_id) REFERENCES seasons(id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'executed_trades' AND column_name = 'season_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE executed_trades DROP CONSTRAINT IF EXISTS executed_trades_season_id_fkey;
    ALTER TABLE executed_trades ALTER COLUMN season_id TYPE INTEGER USING season_id::text::integer;
    ALTER TABLE executed_trades ADD CONSTRAINT executed_trades_season_id_fkey FOREIGN KEY (season_id) REFERENCES seasons(id);
  END IF;
END $$;
