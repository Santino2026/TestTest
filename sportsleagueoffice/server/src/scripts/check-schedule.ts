import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db/pool';

async function checkSchedule() {
  // Get the most recent season
  const seasonResult = await pool.query(`
    SELECT DISTINCT season_id FROM schedule ORDER BY season_id DESC LIMIT 1
  `);
  const seasonId = seasonResult.rows[0]?.season_id;

  if (!seasonId) {
    console.log('No schedules found');
    await pool.end();
    return;
  }

  console.log(`Checking season ${seasonId}...\n`);

  // Check games per day distribution
  const daysResult = await pool.query(`
    SELECT
      game_day,
      COUNT(*) as games
    FROM schedule
    WHERE season_id = $1
      AND status = 'scheduled'
      AND (is_preseason = FALSE OR is_preseason IS NULL)
    GROUP BY game_day
    ORDER BY game_day
    LIMIT 20
  `, [seasonId]);

  console.log('Upcoming scheduled games per day:');
  for (const row of daysResult.rows) {
    console.log(`  Day ${row.game_day}: ${row.games} games`);
  }

  // Check team game counts
  const teamResult = await pool.query(`
    SELECT
      t.city || ' ' || t.name as team,
      COUNT(*) FILTER (WHERE s.status = 'completed') as played,
      COUNT(*) as total
    FROM teams t
    LEFT JOIN schedule s ON (t.id = s.home_team_id OR t.id = s.away_team_id)
      AND s.season_id = $1
      AND (s.is_preseason = FALSE OR s.is_preseason IS NULL)
    GROUP BY t.id, t.city, t.name
    ORDER BY played DESC
    LIMIT 10
  `, [seasonId]);

  console.log('\nTeam game counts (top 10 by games played):');
  for (const row of teamResult.rows) {
    console.log(`  ${row.team}: ${row.played}/${row.total} played`);
  }

  // Check min/max games played across all teams
  const minMaxResult = await pool.query(`
    SELECT
      MIN(played) as min_played,
      MAX(played) as max_played
    FROM (
      SELECT
        t.id,
        COUNT(*) FILTER (WHERE s.status = 'completed') as played
      FROM teams t
      LEFT JOIN schedule s ON (t.id = s.home_team_id OR t.id = s.away_team_id)
        AND s.season_id = $1
        AND (s.is_preseason = FALSE OR s.is_preseason IS NULL)
      GROUP BY t.id
    ) team_counts
  `, [seasonId]);

  const { min_played, max_played } = minMaxResult.rows[0];
  console.log(`\nGame spread: ${min_played} to ${max_played} games played (gap: ${max_played - min_played})`);

  await pool.end();
}

checkSchedule().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
