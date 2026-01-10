// Automated test: Play through an entire season
// This script simulates a complete season to find and report bugs

import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { saveCompleteGameResult, GameResult } from '../services/gamePersistence';

interface TestResult {
  phase: string;
  day: number;
  success: boolean;
  error?: string;
  gamesSimulated?: number;
}

const results: TestResult[] = [];

async function simulateDayGames(seasonId: string | number, gameDate: string, isPreseason: boolean, franchiseTeamId: string) {
  const gamesResult = await pool.query(
    `SELECT s.*, ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_date = $2 AND s.status = 'scheduled' AND s.is_preseason = $3`,
    [seasonId, gameDate, isPreseason]
  );

  let userGameResult = null;

  for (const scheduledGame of gamesResult.rows) {
    const isUserGame = scheduledGame.home_team_id === franchiseTeamId ||
                       scheduledGame.away_team_id === franchiseTeamId;

    // Load teams
    const homeTeam = await loadTeamForSimulation(scheduledGame.home_team_id);
    const awayTeam = await loadTeamForSimulation(scheduledGame.away_team_id);

    // Simulate game
    const simResult = simulateGame(homeTeam, awayTeam);

    // Save game result
    const gameResult: GameResult = {
      id: simResult.id,
      home_team_id: simResult.home_team_id,
      away_team_id: simResult.away_team_id,
      home_score: simResult.home_score,
      away_score: simResult.away_score,
      winner_id: simResult.winner_id,
      is_overtime: simResult.is_overtime,
      overtime_periods: simResult.overtime_periods,
      quarters: simResult.quarters,
      home_stats: simResult.home_stats,
      away_stats: simResult.away_stats,
      home_player_stats: simResult.home_player_stats.map((ps: any) => ({
        ...ps,
        player_id: ps.player_id
      })),
      away_player_stats: simResult.away_player_stats.map((ps: any) => ({
        ...ps,
        player_id: ps.player_id
      }))
    };

    await saveCompleteGameResult(
      gameResult,
      String(seasonId),
      { id: homeTeam.id, starters: homeTeam.starters },
      { id: awayTeam.id, starters: awayTeam.starters },
      !isPreseason // Update standings only for regular season
    );

    // Update schedule
    await pool.query(
      `UPDATE schedule SET status = 'completed', game_id = $1, is_user_game = $2 WHERE id = $3`,
      [simResult.id, isUserGame, scheduledGame.id]
    );

    if (isUserGame) {
      const userWon = simResult.winner_id === franchiseTeamId;
      userGameResult = {
        won: userWon,
        score: scheduledGame.home_team_id === franchiseTeamId
          ? `${simResult.home_score}-${simResult.away_score}`
          : `${simResult.away_score}-${simResult.home_score}`,
        opponent: scheduledGame.home_team_id === franchiseTeamId
          ? scheduledGame.away_team_name
          : scheduledGame.home_team_name
      };
    }
  }

  return { gamesSimulated: gamesResult.rows.length, userGameResult };
}

async function runFullSeasonTest() {
  console.log('=== AUTOMATED FULL SEASON TEST ===\n');

  // Get the franchise
  const franchiseResult = await pool.query(
    `SELECT f.*, t.name as team_name FROM franchises f
     JOIN teams t ON f.team_id = t.id
     ORDER BY f.created_at DESC LIMIT 1`
  );

  if (franchiseResult.rows.length === 0) {
    console.error('No franchise found!');
    return;
  }

  const franchise = franchiseResult.rows[0];
  console.log(`Testing with franchise: ${franchise.team_name}`);
  console.log(`Starting phase: ${franchise.phase}, day: ${franchise.current_day}`);
  console.log(`Season ID: ${franchise.season_id}\n`);

  const seasonStart = new Date('2024-10-22');
  let currentDay = franchise.current_day;
  let currentPhase = franchise.phase;
  let userWins = 0;
  let userLosses = 0;

  // === PRESEASON ===
  if (currentPhase === 'preseason') {
    console.log('--- PRESEASON ---');

    while (currentDay <= 0) {
      const gameDate = new Date(seasonStart);
      gameDate.setDate(gameDate.getDate() + currentDay);
      const gameDateStr = gameDate.toISOString().split('T')[0];

      try {
        const { gamesSimulated, userGameResult } = await simulateDayGames(
          franchise.season_id, gameDateStr, true, franchise.team_id
        );

        if (userGameResult) {
          if (userGameResult.won) userWins++; else userLosses++;
          console.log(`Day ${currentDay}: ${userGameResult.won ? 'W' : 'L'} vs ${userGameResult.opponent} (${userGameResult.score}) - ${gamesSimulated} games`);
        } else {
          console.log(`Day ${currentDay}: No user game - ${gamesSimulated} games simulated`);
        }

        results.push({ phase: 'preseason', day: currentDay, success: true, gamesSimulated });
        currentDay++;
      } catch (error: any) {
        console.error(`PRESEASON ERROR Day ${currentDay}:`, error.message);
        results.push({ phase: 'preseason', day: currentDay, success: false, error: error.message });

        // Try to continue
        currentDay++;
      }
    }

    // Update franchise to regular season
    await pool.query(
      `UPDATE franchises SET current_day = 1, phase = 'regular_season',
       preseason_wins = $1, preseason_losses = $2 WHERE id = $3`,
      [userWins, userLosses, franchise.id]
    );

    currentPhase = 'regular_season';
    currentDay = 1;
    console.log(`\nPreseason complete! Record: ${userWins}-${userLosses}`);
    userWins = 0;
    userLosses = 0;
  }

  // === REGULAR SEASON ===
  if (currentPhase === 'regular_season') {
    console.log('\n--- REGULAR SEASON ---');

    let gamesPlayed = 0;
    const maxDays = 174; // Regular season length

    while (currentDay <= maxDays) {
      const gameDate = new Date(seasonStart);
      gameDate.setDate(gameDate.getDate() + currentDay);
      const gameDateStr = gameDate.toISOString().split('T')[0];

      try {
        const { gamesSimulated, userGameResult } = await simulateDayGames(
          franchise.season_id, gameDateStr, false, franchise.team_id
        );

        gamesPlayed += gamesSimulated;

        if (userGameResult) {
          if (userGameResult.won) userWins++; else userLosses++;
        }

        // Progress every 10 days
        if (currentDay % 10 === 0) {
          console.log(`Day ${currentDay}: Record ${userWins}-${userLosses}, Total games: ${gamesPlayed}`);
        }

        results.push({ phase: 'regular_season', day: currentDay, success: true, gamesSimulated });
        currentDay++;
      } catch (error: any) {
        console.error(`REGULAR SEASON ERROR Day ${currentDay}:`, error.message);
        results.push({ phase: 'regular_season', day: currentDay, success: false, error: error.message });

        // Log full error for debugging
        console.error(error.stack);

        // Try to continue
        currentDay++;
      }
    }

    // Update franchise
    await pool.query(
      `UPDATE franchises SET current_day = $1, phase = 'playoffs' WHERE id = $2`,
      [currentDay, franchise.id]
    );

    console.log(`\nRegular season complete! Final record: ${userWins}-${userLosses}`);
  }

  // === SUMMARY ===
  console.log('\n=== TEST SUMMARY ===');

  const failures = results.filter(r => !r.success);
  const successes = results.filter(r => r.success);

  console.log(`Total days tested: ${results.length}`);
  console.log(`Successful: ${successes.length}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  ${f.phase} Day ${f.day}: ${f.error}`);
    }
  }

  const totalGames = successes.reduce((sum, r) => sum + (r.gamesSimulated || 0), 0);
  console.log(`\nTotal games simulated: ${totalGames}`);

  await pool.end();
}

runFullSeasonTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
