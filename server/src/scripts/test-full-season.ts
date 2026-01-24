// Automated test: Simulate a complete 82-game season and validate all stats
// Creates its own test franchise, simulates, validates, then cleans up
// Usage: npx ts-node src/scripts/test-full-season.ts

import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { saveCompleteGameResult, GameResult } from '../services/gamePersistence';
import { generateSchedule } from '../schedule/generator';
import { REGULAR_SEASON_END_DAY, SEASON_START_DATE } from '../constants';

function calculateGameDate(currentDay: number): string {
  const seasonStart = new Date(SEASON_START_DATE);
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + currentDay - 1);
  return gameDate.toISOString().split('T')[0];
}

async function createTestSeason(): Promise<{ seasonId: number; teamId: string; teamName: string }> {
  console.log('Creating test season...');

  const newSeason = await pool.query(
    `INSERT INTO seasons (season_number, status) VALUES (99, 'regular') RETURNING id`
  );
  const seasonId = newSeason.rows[0].id;

  const teamsResult = await pool.query('SELECT id, name, conference, division FROM teams');
  const teams = teamsResult.rows;
  const testTeam = teams[0];

  // Create standings for all teams
  for (const t of teams) {
    await pool.query(
      `INSERT INTO standings (season_id, team_id, wins, losses, home_wins, home_losses,
       away_wins, away_losses, conference_wins, conference_losses, division_wins, division_losses,
       points_for, points_against, streak, last_10_wins)
       VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
       ON CONFLICT (season_id, team_id) DO NOTHING`,
      [seasonId, t.id]
    );
  }

  // Generate schedule
  const schedule = generateSchedule(teams);
  const batchSize = 100;
  for (let i = 0; i < schedule.length; i += batchSize) {
    const batch = schedule.slice(i, i + batchSize);
    const values: any[] = [];
    const placeholders: string[] = [];

    batch.forEach((game: any, idx: number) => {
      const offset = idx * 7;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      values.push(seasonId, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, false, game.game_day);
    });

    await pool.query(
      `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_preseason, game_day)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  console.log(`  Season ID: ${seasonId}, Team: ${testTeam.name}\n`);
  return { seasonId, teamId: testTeam.id, teamName: testTeam.name };
}

async function cleanupTestData(seasonId: number) {
  console.log('\nCleaning up test data...');
  await pool.query(`DELETE FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]);
  await pool.query(`DELETE FROM player_game_stats WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]);
  await pool.query(`DELETE FROM team_game_stats WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]);
  await pool.query(`DELETE FROM game_quarters WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]);
  await pool.query(`DELETE FROM games WHERE season_id = $1`, [seasonId]);
  await pool.query(`DELETE FROM player_season_stats WHERE season_id = $1`, [seasonId]);
  await pool.query(`DELETE FROM team_season_stats WHERE season_id = $1`, [seasonId]);
  await pool.query(`DELETE FROM standings WHERE season_id = $1`, [seasonId]);
  await pool.query(`DELETE FROM schedule WHERE season_id = $1`, [seasonId]);
  await pool.query(`DELETE FROM seasons WHERE id = $1`, [seasonId]);
  console.log('Cleanup complete.');
}

async function runFullSeasonTest() {
  console.log('=== FULL SEASON SIMULATION TEST ===\n');

  const { seasonId, teamId, teamName } = await createTestSeason();

  // Simulate all game days
  console.log('--- SIMULATING 82-GAME SEASON (1230 games) ---');
  let totalGames = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let day = 1; day <= REGULAR_SEASON_END_DAY; day++) {
    const gameDateStr = calculateGameDate(day);

    const gamesResult = await pool.query(
      `SELECT s.id, s.home_team_id, s.away_team_id
       FROM schedule s
       WHERE s.season_id = $1 AND s.game_day = $2 AND s.status = 'scheduled'
         AND (s.is_preseason = false OR s.is_preseason IS NULL)`,
      [seasonId, day]
    );

    if (gamesResult.rows.length === 0) continue;

    for (const scheduledGame of gamesResult.rows) {
      try {
        const homeTeam = await loadTeamForSimulation(scheduledGame.home_team_id);
        const awayTeam = await loadTeamForSimulation(scheduledGame.away_team_id);
        const simResult = simulateGame(homeTeam, awayTeam);

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
          })),
          plays: simResult.plays
        };

        await saveCompleteGameResult(
          gameResult,
          String(seasonId),
          { id: homeTeam.id, starters: homeTeam.starters },
          { id: awayTeam.id, starters: awayTeam.starters },
          true,
          undefined,
          false,
          gameDateStr
        );

        await pool.query(
          `UPDATE schedule SET status = 'completed', game_id = $1 WHERE id = $2`,
          [simResult.id, scheduledGame.id]
        );

        totalGames++;
      } catch (error: any) {
        errors++;
        if (errors <= 5) console.error(`  ERROR Day ${day}: ${error.message}`);
      }
    }

    if (day % 25 === 0 || day === REGULAR_SEASON_END_DAY) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Day ${day}/${REGULAR_SEASON_END_DAY}: ${totalGames} games simulated (${elapsed}s)`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone: ${totalGames} games in ${totalTime}s (${errors} errors)\n`);

  // === VALIDATE STATS ===
  console.log('=== VALIDATING STATS ===\n');
  let issues = 0;

  function check(label: string, actual: number, expected: number | null, max?: number, min?: number, mode?: string) {
    if (mode === 'range') {
      if (actual >= min! && actual <= max!) {
        console.log(`  PASS: ${label} = ${Number.isInteger(actual) ? actual : actual.toFixed(3)} (${min}-${max})`);
      } else {
        console.log(`  FAIL: ${label} = ${Number.isInteger(actual) ? actual : actual.toFixed(3)} (expected ${min}-${max})`);
        issues++;
      }
    } else {
      if (actual === expected) {
        console.log(`  PASS: ${label} = ${actual}`);
      } else {
        console.log(`  FAIL: ${label} = ${actual} (expected ${expected})`);
        issues++;
      }
    }
  }

  // 1. Total games
  const gamesCount = await pool.query(
    `SELECT COUNT(*) as total FROM games WHERE season_id = $1`, [seasonId]
  );
  const actualGames = parseInt(gamesCount.rows[0].total);
  check('Total games', actualGames, 1230);

  // 2. Standings
  console.log('\n--- Standings ---');
  const standings = await pool.query(
    `SELECT s.*, t.name FROM standings s JOIN teams t ON s.team_id = t.id
     WHERE s.season_id = $1 ORDER BY s.wins DESC`, [seasonId]
  );

  const totalWins = standings.rows.reduce((sum: number, r: any) => sum + r.wins, 0);
  check('Total W = total games', totalWins, actualGames);

  for (const team of standings.rows) {
    const gp = team.wins + team.losses;
    if (gp !== 82) {
      console.log(`  FAIL: ${team.name} played ${gp} games (expected 82)`);
      issues++;
    }
  }

  const bestWins = standings.rows[0].wins;
  const worstWins = standings.rows[standings.rows.length - 1].wins;
  check('Best team wins', bestWins, null, 72, 50, 'range');
  check('Worst team wins', worstWins, null, 32, 10, 'range');

  console.log(`\n  Top 5:`);
  standings.rows.slice(0, 5).forEach((t: any) =>
    console.log(`    ${t.name}: ${t.wins}-${t.losses} (streak: ${t.streak}, L10: ${t.last_10_wins})`)
  );
  console.log(`  Bottom 5:`);
  standings.rows.slice(-5).forEach((t: any) =>
    console.log(`    ${t.name}: ${t.wins}-${t.losses} (streak: ${t.streak}, L10: ${t.last_10_wins})`)
  );

  // 3. Team season stats
  console.log('\n--- Team Stats ---');
  const teamStats = await pool.query(
    `SELECT ts.*, t.name FROM team_season_stats ts JOIN teams t ON ts.team_id = t.id
     WHERE ts.season_id = $1 ORDER BY ts.points_for DESC`, [seasonId]
  );

  const avgPpg = teamStats.rows.reduce((sum: number, r: any) => sum + r.points_for, 0) / teamStats.rows.length / 82;
  check('Avg team PPG', avgPpg, null, 125, 95, 'range');

  const avgFg = teamStats.rows.reduce((sum: number, r: any) => sum + parseFloat(r.fg_pct || 0), 0) / teamStats.rows.length;
  check('Avg FG%', avgFg, null, 0.52, 0.42, 'range');

  const avg3 = teamStats.rows.reduce((sum: number, r: any) => sum + parseFloat(r.three_pct || 0), 0) / teamStats.rows.length;
  check('Avg 3PT%', avg3, null, 0.40, 0.30, 'range');

  const avgFt = teamStats.rows.reduce((sum: number, r: any) => sum + parseFloat(r.ft_pct || 0), 0) / teamStats.rows.length;
  check('Avg FT%', avgFt, null, 0.85, 0.70, 'range');

  check('Teams with eFG%', teamStats.rows.filter((r: any) => r.effective_fg_pct !== null).length, 30);
  check('Teams with minutes', teamStats.rows.filter((r: any) => r.minutes > 0).length, 30);
  check('Teams with W/L tracked', teamStats.rows.filter((r: any) => r.wins > 0 || r.losses > 0).length, 30);

  // 4. Player season stats
  console.log('\n--- Player Stats (50+ GP) ---');
  const playerStats = await pool.query(
    `SELECT ps.*, p.first_name, p.last_name, p.position
     FROM player_season_stats ps JOIN players p ON ps.player_id = p.id
     WHERE ps.season_id = $1 AND ps.games_played >= 50
     ORDER BY ps.ppg DESC`, [seasonId]
  );

  if (playerStats.rows.length === 0) {
    console.log('  FAIL: No player stats found (50+ GP)');
    issues++;
  } else {
    const top = playerStats.rows[0];
    console.log(`\n  Scoring: ${top.first_name} ${top.last_name} - ${top.ppg} PPG`);
    check('Scoring leader PPG', parseFloat(top.ppg), null, 38, 20, 'range');

    console.log(`  Top 10:`);
    playerStats.rows.slice(0, 10).forEach((p: any) =>
      console.log(`    ${p.first_name} ${p.last_name} (${p.position}): ${p.ppg}/${p.rpg}/${p.apg} PER:${p.per} WS:${p.win_shares}`)
    );

    const rebLeader = [...playerStats.rows].sort((a: any, b: any) => b.rpg - a.rpg)[0];
    console.log(`\n  Rebounds: ${rebLeader.first_name} ${rebLeader.last_name} - ${rebLeader.rpg} RPG`);
    check('Rebound leader', parseFloat(rebLeader.rpg), null, 16, 8, 'range');

    const astLeader = [...playerStats.rows].sort((a: any, b: any) => b.apg - a.apg)[0];
    console.log(`  Assists: ${astLeader.first_name} ${astLeader.last_name} - ${astLeader.apg} APG`);
    check('Assist leader', parseFloat(astLeader.apg), null, 13, 5, 'range');

    // Advanced stats checks
    const withPER = playerStats.rows.filter((p: any) => p.per !== null && parseFloat(p.per) > 0);
    check('Players with PER', withPER.length, playerStats.rows.length);

    const avgPER = withPER.reduce((sum: number, p: any) => sum + parseFloat(p.per), 0) / withPER.length;
    check('Avg PER', avgPER, null, 22, 10, 'range');

    const avgTS = playerStats.rows.reduce((sum: number, p: any) => sum + parseFloat(p.true_shooting_pct || 0), 0) / playerStats.rows.length;
    check('Avg TS%', avgTS, null, 0.65, 0.48, 'range');
  }

  check('Players with assist_pct', playerStats.rows.filter((p: any) => parseFloat(p.assist_pct || 0) > 0).length, null,
    playerStats.rows.length, Math.floor(playerStats.rows.length * 0.9), 'range');
  check('Players with rebound_pct', playerStats.rows.filter((p: any) => parseFloat(p.rebound_pct || 0) > 0).length, null,
    playerStats.rows.length, Math.floor(playerStats.rows.length * 0.9), 'range');
  check('Players with win_shares', playerStats.rows.filter((p: any) => p.win_shares !== null).length, playerStats.rows.length);

  // 5. Plays
  console.log('\n--- Plays ---');
  const playsCount = await pool.query(
    `SELECT COUNT(*) as total FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]
  );
  const totalPlays = parseInt(playsCount.rows[0].total);
  check('Plays stored', totalPlays, null, 2500000, 100000, 'range');
  if (actualGames > 0) console.log(`  Avg plays/game: ${(totalPlays / actualGames).toFixed(0)}`);

  // 6. Game metadata
  console.log('\n--- Metadata ---');
  const withDate = await pool.query(
    `SELECT COUNT(*) as total FROM games WHERE season_id = $1 AND game_date IS NOT NULL`, [seasonId]
  );
  check('Games with date', parseInt(withDate.rows[0].total), actualGames);

  // 7. Score distribution
  console.log('\n--- Score Distribution ---');
  const dist = (await pool.query(
    `SELECT AVG(home_score + away_score) as avg_total,
            AVG(ABS(home_score - away_score)) as avg_margin,
            COUNT(CASE WHEN is_overtime THEN 1 END) as ot_games
     FROM games WHERE season_id = $1`, [seasonId]
  )).rows[0];

  check('Avg total score', parseFloat(dist.avg_total), null, 240, 185, 'range');
  check('Avg margin', parseFloat(dist.avg_margin), null, 16, 7, 'range');
  const otPct = actualGames > 0 ? parseInt(dist.ot_games) / actualGames * 100 : 0;
  check('OT game %', otPct, null, 12, 2, 'range');

  // 8. Streak/last10
  console.log('\n--- Streak/L10 ---');
  check('Teams w/ streak', standings.rows.filter((r: any) => r.streak !== 0).length, null, 30, 15, 'range');
  check('Teams w/ L10 > 0', standings.rows.filter((r: any) => r.last_10_wins > 0).length, null, 30, 20, 'range');

  // === SUMMARY ===
  console.log('\n=== RESULT ===');
  console.log(`Games: ${totalGames} | Errors: ${errors} | Issues: ${issues}`);
  console.log(issues === 0 && errors === 0 ? 'STATUS: ALL PASS' : `STATUS: ${issues} ISSUES`);

  // Cleanup
  await cleanupTestData(seasonId);
  await pool.end();
}

runFullSeasonTest().catch(err => {
  console.error('Test crashed:', err);
  pool.end();
  process.exit(1);
});
