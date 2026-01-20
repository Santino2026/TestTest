import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db/pool';

async function verify() {
  const seasonId = 129;
  const checkpoints = [10, 20, 30, 40, 50, 82];

  console.log('Schedule balance verification:');
  console.log('==============================\n');

  for (const day of checkpoints) {
    const result = await pool.query(`
      SELECT
        MIN(cnt) as min_games,
        MAX(cnt) as max_games,
        MAX(cnt) - MIN(cnt) as spread
      FROM (
        SELECT t.id, COUNT(s.id) as cnt
        FROM teams t
        LEFT JOIN schedule s ON (t.id = s.home_team_id OR t.id = s.away_team_id)
          AND s.season_id = $1
          AND s.game_day <= $2
          AND (s.is_preseason = FALSE OR s.is_preseason IS NULL)
        GROUP BY t.id
      ) team_counts
    `, [seasonId, day]);

    const r = result.rows[0];
    const status = parseInt(r.spread) <= 3 ? '✓' : '✗';
    console.log(`Day ${day.toString().padStart(2)}: ${r.min_games}-${r.max_games} games (spread: ${r.spread}) ${status}`);
  }

  console.log('\nTarget: spread ≤ 3 at all checkpoints');

  await pool.end();
}

verify().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
