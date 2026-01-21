-- Move excess players (beyond top 15 by OVR) to free agency
WITH ranked_players AS (
  SELECT id, team_id, overall,
         ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY overall DESC) as rank
  FROM players
  WHERE team_id IS NOT NULL
)
UPDATE players
SET team_id = NULL
WHERE id IN (
  SELECT id FROM ranked_players WHERE rank > 15
);
