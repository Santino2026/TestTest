// Time how long simulation takes
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { saveCompleteGameResult, GameResult } from '../services/gamePersistence';

async function timeSim() {
  console.log('=== TIMING SIMULATION ===\n');

  const franchise = (await pool.query(`
    SELECT f.*, t.name as team_name
    FROM franchises f JOIN teams t ON f.team_id = t.id
    WHERE f.is_active = true LIMIT 1
  `)).rows[0];

  if (!franchise) {
    console.log('No franchise');
    await pool.end();
    return;
  }

  console.log('Franchise:', franchise.team_name, 'Day:', franchise.current_day);

  const seasonStart = new Date('2024-10-22');
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + franchise.current_day);
  const gameDateStr = gameDate.toISOString().split('T')[0];

  const games = (await pool.query(`
    SELECT s.*, ht.name as home_name, at.name as away_name
    FROM schedule s
    JOIN teams ht ON s.home_team_id = ht.id
    JOIN teams at ON s.away_team_id = at.id
    WHERE s.season_id = $1 AND s.game_date = $2 AND s.is_preseason = true AND s.status = 'scheduled'
  `, [franchise.season_id, gameDateStr])).rows;

  console.log('Games to simulate:', games.length);

  const totalStart = Date.now();

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const gameStart = Date.now();

    // Load teams
    const loadStart = Date.now();
    const homeTeam = await loadTeamForSimulation(game.home_team_id);
    const awayTeam = await loadTeamForSimulation(game.away_team_id);
    const loadTime = Date.now() - loadStart;

    // Simulate
    const simStart = Date.now();
    const simResult = simulateGame(homeTeam, awayTeam);
    const simTime = Date.now() - simStart;

    // Save
    const saveStart = Date.now();
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
      franchise.season_id,
      { id: homeTeam.id, starters: homeTeam.starters },
      { id: awayTeam.id, starters: awayTeam.starters },
      false
    );
    const saveTime = Date.now() - saveStart;

    // Update schedule
    await pool.query(
      `UPDATE schedule SET status = 'completed', game_id = $1 WHERE id = $2`,
      [simResult.id, game.id]
    );

    const totalGameTime = Date.now() - gameStart;
    console.log(`Game ${i + 1}: load=${loadTime}ms, sim=${simTime}ms, save=${saveTime}ms, total=${totalGameTime}ms`);
  }

  const totalTime = Date.now() - totalStart;
  console.log(`\nTOTAL TIME: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
  console.log(`Average per game: ${(totalTime / games.length).toFixed(0)}ms`);

  await pool.end();
}

timeSim().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
