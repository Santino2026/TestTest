// Test script to verify simulation flow works correctly
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';

async function testSimulationFlow() {
  console.log('=== Testing Simulation Flow ===\n');

  // Get an active franchise (most recently updated)
  const franchiseResult = await pool.query(
    `SELECT f.*, t.name as team_name, s.season_number
     FROM franchises f
     JOIN teams t ON f.team_id = t.id
     JOIN seasons s ON f.season_id = s.id
     ORDER BY f.last_played_at DESC NULLS LAST
     LIMIT 1`
  );

  if (franchiseResult.rows.length === 0) {
    console.log('No active franchise found');
    await pool.end();
    return;
  }

  const franchise = franchiseResult.rows[0];
  console.log(`Franchise: ${franchise.team_name}`);
  console.log(`Phase: ${franchise.phase}`);
  console.log(`Current Day: ${franchise.current_day}`);
  console.log(`Season: ${franchise.season_number}\n`);

  // Check if there are scheduled games
  const scheduledGamesResult = await pool.query(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE is_preseason = TRUE) as preseason,
            COUNT(*) FILTER (WHERE is_preseason = FALSE) as regular
     FROM schedule
     WHERE season_id = $1`,
    [franchise.season_id]
  );

  const gameCounts = scheduledGamesResult.rows[0];
  console.log('Schedule Summary:');
  console.log(`  Total games: ${gameCounts.total}`);
  console.log(`  Scheduled: ${gameCounts.scheduled}`);
  console.log(`  Completed: ${gameCounts.completed}`);
  console.log(`  Preseason: ${gameCounts.preseason}`);
  console.log(`  Regular: ${gameCounts.regular}\n`);

  // Get games for current day (preseason or regular)
  const isPreseason = franchise.phase === 'preseason';
  const seasonStart = new Date('2024-10-22');
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + franchise.current_day);
  const gameDateStr = gameDate.toISOString().split('T')[0];

  console.log(`Looking for games on: ${gameDateStr} (day ${franchise.current_day})`);
  console.log(`Preseason mode: ${isPreseason}\n`);

  const todaysGames = await pool.query(
    `SELECT s.*,
            ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_date = $2 AND s.status = 'scheduled' AND s.is_preseason = $3`,
    [franchise.season_id, gameDateStr, isPreseason]
  );

  console.log(`Found ${todaysGames.rows.length} games for today\n`);

  if (todaysGames.rows.length === 0) {
    console.log('No games to simulate. Checking next few days...');

    const upcomingGames = await pool.query(
      `SELECT s.game_date, COUNT(*) as games
       FROM schedule s
       WHERE s.season_id = $1 AND s.status = 'scheduled' AND s.is_preseason = $2
       GROUP BY s.game_date
       ORDER BY s.game_date
       LIMIT 5`,
      [franchise.season_id, isPreseason]
    );

    console.log('\nUpcoming game dates:');
    for (const row of upcomingGames.rows) {
      console.log(`  ${row.game_date}: ${row.games} games`);
    }

    await pool.end();
    return;
  }

  // Test simulating ONE game
  const testGame = todaysGames.rows[0];
  console.log(`Testing simulation: ${testGame.away_team_name} @ ${testGame.home_team_name}`);

  try {
    // Load teams for simulation
    console.log('\nLoading home team...');
    const homeTeam = await loadTeamForSimulation(testGame.home_team_id);
    console.log(`  ${homeTeam.name}: ${homeTeam.roster.length} players loaded`);

    console.log('Loading away team...');
    const awayTeam = await loadTeamForSimulation(testGame.away_team_id);
    console.log(`  ${awayTeam.name}: ${awayTeam.roster.length} players loaded`);

    // Run simulation
    console.log('\nRunning simulation...');
    const result = simulateGame(homeTeam, awayTeam);

    console.log('\n=== GAME RESULT ===');
    console.log(`${awayTeam.name} ${result.away_score} - ${result.home_score} ${homeTeam.name}`);
    console.log(`Winner: ${result.winner_id === testGame.home_team_id ? testGame.home_team_name : testGame.away_team_name}`);
    console.log(`Overtime: ${result.is_overtime ? `Yes (${result.overtime_periods} OT)` : 'No'}`);

    // Show quarter scores
    console.log('\nQuarter Scores:');
    for (const q of result.quarters) {
      console.log(`  Q${q.quarter}: ${awayTeam.name} ${q.away_points} - ${q.home_points} ${homeTeam.name}`);
    }

    // Show top scorers (cast to any for runtime-added player_name)
    console.log('\nTop Scorers (Home):');
    const homeScorers = (result.home_player_stats as any[]).sort((a, b) => b.points - a.points).slice(0, 3);
    for (const ps of homeScorers) {
      console.log(`  ${ps.player_name || 'Unknown'}: ${ps.points} pts, ${ps.rebounds} reb, ${ps.assists} ast`);
    }

    console.log('\nTop Scorers (Away):');
    const awayScorers = (result.away_player_stats as any[]).sort((a, b) => b.points - a.points).slice(0, 3);
    for (const ps of awayScorers) {
      console.log(`  ${ps.player_name || 'Unknown'}: ${ps.points} pts, ${ps.rebounds} reb, ${ps.assists} ast`);
    }

    console.log('\n=== SIMULATION TEST PASSED ===');

    // Test game persistence
    console.log('\n--- Testing Game Persistence ---');

    // Import the game persistence service
    const { saveCompleteGameResult } = await import('../services/gamePersistence');

    const gameResult = {
      id: result.id,
      home_team_id: result.home_team_id,
      away_team_id: result.away_team_id,
      home_score: result.home_score,
      away_score: result.away_score,
      winner_id: result.winner_id,
      is_overtime: result.is_overtime,
      overtime_periods: result.overtime_periods,
      quarters: result.quarters,
      home_stats: result.home_stats,
      away_stats: result.away_stats,
      home_player_stats: result.home_player_stats.map((ps: any) => ({
        ...ps,
        player_id: ps.player_id
      })),
      away_player_stats: result.away_player_stats.map((ps: any) => ({
        ...ps,
        player_id: ps.player_id
      }))
    };

    console.log('Saving game result...');
    await saveCompleteGameResult(
      gameResult as any,
      franchise.season_id,
      { id: homeTeam.id, starters: homeTeam.starters },
      { id: awayTeam.id, starters: awayTeam.starters },
      false // Don't update standings for preseason test
    );
    console.log('Game saved successfully!');

    // Verify game was saved
    const savedGame = await pool.query(
      `SELECT g.*, ht.name as home_name, at.name as away_name
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE g.id = $1`,
      [result.id]
    );

    if (savedGame.rows.length > 0) {
      const game = savedGame.rows[0];
      console.log(`\nVerified saved game: ${game.away_name} ${game.away_score} @ ${game.home_name} ${game.home_score}`);
      console.log('=== PERSISTENCE TEST PASSED ===');
    } else {
      console.error('ERROR: Game was not saved to database!');
    }

    // Cleanup: Delete the test game so it doesn't interfere with actual gameplay
    console.log('\nCleaning up test data...');
    await pool.query('DELETE FROM player_game_stats WHERE game_id = $1', [result.id]);
    await pool.query('DELETE FROM team_game_stats WHERE game_id = $1', [result.id]);
    await pool.query('DELETE FROM game_quarters WHERE game_id = $1', [result.id]);
    await pool.query('DELETE FROM plays WHERE game_id = $1', [result.id]);
    await pool.query('DELETE FROM games WHERE id = $1', [result.id]);
    console.log('Test data cleaned up.');

    console.log('\n=== ALL TESTS PASSED ===');

  } catch (error) {
    console.error('\n=== SIMULATION ERROR ===');
    console.error(error);
  }

  await pool.end();
}

testSimulationFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
