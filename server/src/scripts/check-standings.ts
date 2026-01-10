// Check standings after full season test
import { pool } from '../db/pool';

async function checkStandings() {
  // Get franchise's season
  const franchise = await pool.query(`
    SELECT f.season_id, f.team_id, t.name as team_name, f.phase, f.current_day,
           COALESCE(f.preseason_wins, 0) as preseason_wins,
           COALESCE(f.preseason_losses, 0) as preseason_losses
    FROM franchises f
    JOIN teams t ON f.team_id = t.id
    WHERE f.is_active = true
    LIMIT 1
  `);

  if (franchise.rows.length === 0) {
    console.log('No active franchise found');
    await pool.end();
    return;
  }

  const f = franchise.rows[0];
  console.log('=== SEASON STATUS ===');
  console.log(`Franchise: ${f.team_name}`);
  console.log(`Phase: ${f.phase}`);
  console.log(`Current Day: ${f.current_day}`);
  console.log(`Preseason Record: ${f.preseason_wins}-${f.preseason_losses}`);

  // Get user team's record
  const userRecord = await pool.query(`
    SELECT s.wins, s.losses, s.home_wins, s.home_losses, s.away_wins, s.away_losses,
           s.conference_wins, s.conference_losses, s.division_wins, s.division_losses,
           s.points_for, s.points_against
    FROM standings s WHERE s.season_id = $1 AND s.team_id = $2
  `, [f.season_id, f.team_id]);

  if (userRecord.rows[0]) {
    const r = userRecord.rows[0];
    console.log(`\nYOUR TEAM RECORD:`);
    console.log(`  Overall: ${r.wins}-${r.losses}`);
    console.log(`  Home: ${r.home_wins}-${r.home_losses}`);
    console.log(`  Away: ${r.away_wins}-${r.away_losses}`);
    console.log(`  Conference: ${r.conference_wins}-${r.conference_losses}`);
    console.log(`  Division: ${r.division_wins}-${r.division_losses}`);
    console.log(`  Points For/Against: ${r.points_for} / ${r.points_against}`);
  }

  // Get top 8 teams by conference
  console.log('\n=== STANDINGS BY CONFERENCE ===');

  for (const conf of ['Eastern', 'Western']) {
    console.log(`\n${conf} Conference:`);
    const standings = await pool.query(`
      SELECT t.name, s.wins, s.losses
      FROM standings s
      JOIN teams t ON s.team_id = t.id
      WHERE s.season_id = $1 AND t.conference = $2
      ORDER BY s.wins DESC, (s.points_for - s.points_against) DESC
      LIMIT 8
    `, [f.season_id, conf]);

    let seed = 1;
    for (const team of standings.rows) {
      const marker = team.name === f.team_name ? ' <-- YOUR TEAM' : '';
      console.log(`  ${seed}. ${team.name}: ${team.wins}-${team.losses}${marker}`);
      seed++;
    }
  }

  // Check if playoffs have started
  const playoffSeries = await pool.query(`
    SELECT COUNT(*) as count FROM playoff_series WHERE season_id = $1
  `, [f.season_id]);

  console.log(`\nPlayoff Series Created: ${playoffSeries.rows[0].count}`);

  await pool.end();
}

checkStandings().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
