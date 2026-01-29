-- Fill team rosters to 15 players with balanced positions
-- Target: 3 players per position (PG, SG, SF, PF, C)

DO $$
DECLARE
  team_rec RECORD;
  pos TEXT;
  positions TEXT[] := ARRAY['PG', 'SG', 'SF', 'PF', 'C'];
  current_count INT;
  needed INT;
  fa_id UUID;
BEGIN
  -- For each team
  FOR team_rec IN SELECT id, abbreviation FROM teams LOOP
    -- For each position
    FOREACH pos IN ARRAY positions LOOP
      -- Count current players at this position
      SELECT COUNT(*) INTO current_count
      FROM players
      WHERE team_id = team_rec.id AND position = pos;

      -- Need 3 per position
      needed := 3 - current_count;

      -- Assign free agents if needed
      WHILE needed > 0 LOOP
        -- Get best available free agent at this position
        SELECT id INTO fa_id
        FROM players
        WHERE team_id IS NULL AND position = pos
        ORDER BY overall DESC
        LIMIT 1;

        EXIT WHEN fa_id IS NULL;

        -- Assign to team
        UPDATE players SET team_id = team_rec.id WHERE id = fa_id;

        needed := needed - 1;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
