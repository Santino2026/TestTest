// Debug simulation issues
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';

async function debugSim() {
  console.log('=== DEBUG SIMULATION ===\n');

  // Get franchise
  const f = await pool.query(`
    SELECT f.*, t.name as team_name
    FROM franchises f
    JOIN teams t ON f.team_id = t.id
    WHERE f.is_active = true
    LIMIT 1
  `);

  if (!f.rows[0]) {
    console.log('No active franchise');
    await pool.end();
    return;
  }

  const franchise = f.rows[0];
  console.log('Franchise:', franchise.team_name);
  console.log('Phase:', franchise.phase);
  console.log('Day:', franchise.current_day);
  console.log('Season ID:', franchise.season_id);

  // Calculate game date
  const seasonStart = new Date('2024-10-22');
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + franchise.current_day);
  const gameDateStr = gameDate.toISOString().split('T')[0];
  console.log('\nLooking for games on:', gameDateStr);

  // Get games for today
  const isPreseason = franchise.phase === 'preseason';
  const games = await pool.query(`
    SELECT s.*, ht.name as home_name, at.name as away_name
    FROM schedule s
    JOIN teams ht ON s.home_team_id = ht.id
    JOIN teams at ON s.away_team_id = at.id
    WHERE s.season_id = $1 AND s.game_date = $2 AND s.is_preseason = $3 AND s.status = 'scheduled'
  `, [franchise.season_id, gameDateStr, isPreseason]);

  console.log('Games found:', games.rows.length);

  if (games.rows.length === 0) {
    console.log('\nNo games found! Checking all preseason games...');
    const allPreseason = await pool.query(`
      SELECT game_date, COUNT(*) as count
      FROM schedule
      WHERE season_id = $1 AND is_preseason = true
      GROUP BY game_date
      ORDER BY game_date
    `, [franchise.season_id]);
    console.log('Preseason game dates:');
    for (const row of allPreseason.rows) {
      console.log(`  ${row.game_date}: ${row.count} games`);
    }
    await pool.end();
    return;
  }

  // Try to simulate one game
  const testGame = games.rows[0];
  console.log(`\nTest game: ${testGame.away_name} @ ${testGame.home_name}`);

  try {
    console.log('Loading home team...');
    const homeTeam = await loadTeamForSimulation(testGame.home_team_id);
    console.log(`  Loaded: ${homeTeam.name}, ${homeTeam.roster.length} players`);

    if (homeTeam.roster.length < 5) {
      console.log('  ERROR: Not enough players!');
      console.log('  Roster:', homeTeam.roster.map((p: any) => p.name));
    }

    console.log('Loading away team...');
    const awayTeam = await loadTeamForSimulation(testGame.away_team_id);
    console.log(`  Loaded: ${awayTeam.name}, ${awayTeam.roster.length} players`);

    if (awayTeam.roster.length < 5) {
      console.log('  ERROR: Not enough players!');
      console.log('  Roster:', awayTeam.roster.map((p: any) => p.name));
    }

    console.log('\nSimulating game...');
    const result = simulateGame(homeTeam, awayTeam);
    console.log(`\nResult: ${awayTeam.name} ${result.away_score} - ${result.home_score} ${homeTeam.name}`);
    console.log('SUCCESS!');

  } catch (error: any) {
    console.error('\n=== SIMULATION ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }

  await pool.end();
}

debugSim().catch(err => {
  console.error('Debug failed:', err);
  process.exit(1);
});
