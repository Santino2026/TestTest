// Fix game_day values for existing schedules
// This updates game_day to be based on actual calendar dates instead of sequential index
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db/pool';

async function fixGameDays(seasonId?: number) {
  console.log('Fixing game_day values...');

  // Get seasons to fix (or specific one)
  const seasonsQuery = seasonId
    ? 'SELECT DISTINCT season_id FROM schedule WHERE season_id = $1'
    : 'SELECT DISTINCT season_id FROM schedule';
  const seasonsResult = await pool.query(seasonsQuery, seasonId ? [seasonId] : []);

  for (const { season_id } of seasonsResult.rows) {
    console.log(`\nProcessing season ${season_id}...`);

    // Fix regular season games (game_day should be positive, based on date order)
    const regularResult = await pool.query(`
      WITH date_days AS (
        SELECT DISTINCT game_date,
          ROW_NUMBER() OVER (ORDER BY game_date) as day_num
        FROM schedule
        WHERE season_id = $1 AND (is_preseason = FALSE OR is_preseason IS NULL)
      )
      UPDATE schedule s
      SET game_day = d.day_num
      FROM date_days d
      WHERE s.season_id = $1
        AND s.game_date = d.game_date
        AND (s.is_preseason = FALSE OR s.is_preseason IS NULL)
    `, [season_id]);
    console.log(`  Updated ${regularResult.rowCount} regular season games`);

    // Fix preseason games (game_day should be negative, counting back from -1)
    const preseasonResult = await pool.query(`
      WITH date_days AS (
        SELECT DISTINCT game_date,
          ROW_NUMBER() OVER (ORDER BY game_date) - COUNT(*) OVER () - 1 as day_num
        FROM schedule
        WHERE season_id = $1 AND is_preseason = TRUE
      )
      UPDATE schedule s
      SET game_day = d.day_num
      FROM date_days d
      WHERE s.season_id = $1
        AND s.game_date = d.game_date
        AND s.is_preseason = TRUE
    `, [season_id]);
    console.log(`  Updated ${preseasonResult.rowCount} preseason games`);

    // Verify the fix
    const verifyResult = await pool.query(`
      SELECT
        game_day,
        COUNT(*) as game_count,
        COUNT(DISTINCT home_team_id) + COUNT(DISTINCT away_team_id) as teams_playing
      FROM schedule
      WHERE season_id = $1 AND (is_preseason = FALSE OR is_preseason IS NULL)
      GROUP BY game_day
      ORDER BY game_day
      LIMIT 20
    `, [season_id]);

    console.log(`  Sample game_day distribution (first 20 days):`);
    for (const row of verifyResult.rows) {
      console.log(`    Day ${row.game_day}: ${row.game_count} games`);
    }
  }

  console.log('\nDone!');
  await pool.end();
}

// Get optional season_id from command line
const seasonId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
fixGameDays(seasonId).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
