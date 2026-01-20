import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db/pool';

async function audit() {
  // Get current franchise
  const f = await pool.query('SELECT * FROM franchises WHERE is_active = true LIMIT 1');
  const franchise = f.rows[0];

  if (!franchise) {
    console.log('No active franchise');
    await pool.end();
    return;
  }

  console.log('Franchise team:', franchise.team_id);
  console.log('Current day:', franchise.current_day);
  console.log('Phase:', franchise.phase);
  console.log('Season ID:', franchise.season_id);

  // Check games played per team
  const games = await pool.query(`
    SELECT t.id, t.city, t.name,
      COUNT(*) FILTER (WHERE s.status = 'completed') as played
    FROM teams t
    LEFT JOIN schedule s ON (t.id = s.home_team_id OR t.id = s.away_team_id)
      AND s.season_id = $1
      AND (s.is_preseason = FALSE OR s.is_preseason IS NULL)
    GROUP BY t.id, t.city, t.name
    ORDER BY played DESC
  `, [franchise.season_id]);

  console.log('\nGames played per team (sorted by most played):');
  for (const row of games.rows) {
    console.log(`  ${row.city} ${row.name}: ${row.played}`);
  }

  // Check game_day distribution for remaining games
  const dayDist = await pool.query(`
    SELECT game_day, COUNT(*) as games
    FROM schedule
    WHERE season_id = $1 AND status = 'scheduled'
      AND (is_preseason = FALSE OR is_preseason IS NULL)
    GROUP BY game_day
    ORDER BY game_day
    LIMIT 20
  `, [franchise.season_id]);

  console.log('\nUpcoming game_days (scheduled games):');
  for (const row of dayDist.rows) {
    console.log(`  Day ${row.game_day}: ${row.games} games`);
  }

  // Check how many games each team has on each game_day
  const userTeamSchedule = await pool.query(`
    SELECT game_day, status,
      CASE WHEN home_team_id = $2 THEN 'HOME' ELSE 'AWAY' END as location
    FROM schedule
    WHERE season_id = $1
      AND (home_team_id = $2 OR away_team_id = $2)
      AND (is_preseason = FALSE OR is_preseason IS NULL)
    ORDER BY game_day
    LIMIT 30
  `, [franchise.season_id, franchise.team_id]);

  console.log('\nUser team schedule (first 30 games):');
  for (const row of userTeamSchedule.rows) {
    console.log(`  Day ${row.game_day}: ${row.status} (${row.location})`);
  }

  await pool.end();
}

audit().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
