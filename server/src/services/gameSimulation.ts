// Game simulation helpers for season advancement
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from './simulation';
import { saveCompleteGameResult, GameResult } from './gamePersistence';
import { SEASON_START_DATE } from '../constants';

interface SimulationResult {
  gameDateStr: string;
  results: GameSimResult[];
  userGameResult: UserGameResult | null;
}

interface GameSimResult {
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  is_user_game: boolean;
  is_preseason?: boolean;
}

interface UserGameResult {
  game_id: string;
  won: boolean;
  user_score: number;
  opponent_score: number;
  opponent_name: string;
  is_overtime: boolean;
  overtime_periods: number;
}

interface FranchiseContext {
  id: string;
  season_id: string;
  team_id: string;
  current_day: number;
}

/**
 * Simulate a single day's games (regular season)
 * Updates standings after each game
 */
export async function simulateDayGames(franchise: FranchiseContext): Promise<SimulationResult> {
  const seasonId = franchise.season_id;
  const currentDay = franchise.current_day;

  // Calculate the game date for this day
  const seasonStart = new Date(SEASON_START_DATE);
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + currentDay);
  const gameDateStr = gameDate.toISOString().split('T')[0];

  // Get all regular season games scheduled for this day
  const gamesResult = await pool.query(
    `SELECT s.*,
            ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_date = $2 AND s.status = 'scheduled' AND s.is_preseason = FALSE`,
    [seasonId, gameDateStr]
  );

  const results: GameSimResult[] = [];
  let userGameResult: UserGameResult | null = null;

  for (const scheduledGame of gamesResult.rows) {
    // Atomically claim the game to prevent double-simulation from concurrent requests
    const claimResult = await pool.query(
      `UPDATE schedule SET status = 'simulating'
       WHERE id = $1 AND status = 'scheduled'
       RETURNING *`,
      [scheduledGame.id]
    );

    // Skip if already claimed by another request
    if (claimResult.rows.length === 0) {
      continue;
    }

    const isUserGame = scheduledGame.home_team_id === franchise.team_id ||
                       scheduledGame.away_team_id === franchise.team_id;

    // Simulate the game
    const homeTeam = await loadTeamForSimulation(scheduledGame.home_team_id);
    const awayTeam = await loadTeamForSimulation(scheduledGame.away_team_id);
    const simResult = simulateGame(homeTeam, awayTeam);

    // Convert to GameResult format
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

    // Save complete game result with standings and advanced stats
    await saveCompleteGameResult(
      gameResult,
      seasonId,
      { id: homeTeam.id, starters: homeTeam.starters },
      { id: awayTeam.id, starters: awayTeam.starters },
      true // Update standings for regular season
    );

    // Mark game as completed
    await pool.query(
      `UPDATE schedule SET status = 'completed', game_id = $1, is_user_game = $2
       WHERE id = $3`,
      [simResult.id, isUserGame, scheduledGame.id]
    );

    // Track user's game result
    if (isUserGame) {
      const userIsHome = scheduledGame.home_team_id === franchise.team_id;
      const userWon = simResult.winner_id === franchise.team_id;
      const userScore = userIsHome ? simResult.home_score : simResult.away_score;
      const opponentScore = userIsHome ? simResult.away_score : simResult.home_score;
      const opponentName = userIsHome ? scheduledGame.away_team_name : scheduledGame.home_team_name;

      userGameResult = {
        game_id: simResult.id,
        won: userWon,
        user_score: userScore,
        opponent_score: opponentScore,
        opponent_name: opponentName,
        is_overtime: simResult.is_overtime,
        overtime_periods: simResult.overtime_periods
      };
    }

    results.push({
      game_id: simResult.id,
      home_team: scheduledGame.home_team_name,
      away_team: scheduledGame.away_team_name,
      home_score: simResult.home_score,
      away_score: simResult.away_score,
      is_user_game: isUserGame
    });
  }

  return { gameDateStr, results, userGameResult };
}

/**
 * Simulate preseason games (no standings updates)
 * Updates franchise preseason record for user games
 */
export async function simulatePreseasonDayGames(franchise: FranchiseContext): Promise<SimulationResult> {
  const seasonId = franchise.season_id;
  const currentDay = franchise.current_day; // -7 to 0 for preseason

  // Calculate the game date for this day
  const seasonStart = new Date(SEASON_START_DATE);
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + currentDay);
  const gameDateStr = gameDate.toISOString().split('T')[0];

  // Get all preseason games scheduled for this day
  const gamesResult = await pool.query(
    `SELECT s.*,
            ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_date = $2 AND s.status = 'scheduled' AND s.is_preseason = TRUE`,
    [seasonId, gameDateStr]
  );

  const results: GameSimResult[] = [];
  let userGameResult: UserGameResult | null = null;

  for (const scheduledGame of gamesResult.rows) {
    // Atomically claim the game to prevent double-simulation from concurrent requests
    const claimResult = await pool.query(
      `UPDATE schedule SET status = 'simulating'
       WHERE id = $1 AND status = 'scheduled'
       RETURNING *`,
      [scheduledGame.id]
    );

    // Skip if already claimed by another request
    if (claimResult.rows.length === 0) {
      continue;
    }

    const isUserGame = scheduledGame.home_team_id === franchise.team_id ||
                       scheduledGame.away_team_id === franchise.team_id;

    // Simulate the game
    const homeTeam = await loadTeamForSimulation(scheduledGame.home_team_id);
    const awayTeam = await loadTeamForSimulation(scheduledGame.away_team_id);
    const simResult = simulateGame(homeTeam, awayTeam);

    // Convert to GameResult format
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

    // Save complete game result WITHOUT standings (preseason)
    await saveCompleteGameResult(
      gameResult,
      seasonId,
      { id: homeTeam.id, starters: homeTeam.starters },
      { id: awayTeam.id, starters: awayTeam.starters },
      false // Don't update standings for preseason
    );

    // Update schedule entry
    await pool.query(
      `UPDATE schedule SET status = 'completed', game_id = $1, is_user_game = $2
       WHERE id = $3`,
      [simResult.id, isUserGame, scheduledGame.id]
    );

    // Track user's preseason record
    if (isUserGame) {
      const userIsHome = scheduledGame.home_team_id === franchise.team_id;
      const userWon = simResult.winner_id === franchise.team_id;
      const userScore = userIsHome ? simResult.home_score : simResult.away_score;
      const opponentScore = userIsHome ? simResult.away_score : simResult.home_score;
      const opponentName = userIsHome ? scheduledGame.away_team_name : scheduledGame.home_team_name;

      // Update franchise preseason record
      if (userWon) {
        await pool.query(
          `UPDATE franchises SET preseason_wins = COALESCE(preseason_wins, 0) + 1 WHERE id = $1`,
          [franchise.id]
        );
      } else {
        await pool.query(
          `UPDATE franchises SET preseason_losses = COALESCE(preseason_losses, 0) + 1 WHERE id = $1`,
          [franchise.id]
        );
      }

      userGameResult = {
        game_id: simResult.id,
        won: userWon,
        user_score: userScore,
        opponent_score: opponentScore,
        opponent_name: opponentName,
        is_overtime: simResult.is_overtime,
        overtime_periods: simResult.overtime_periods
      };
    }

    results.push({
      game_id: simResult.id,
      home_team: scheduledGame.home_team_name,
      away_team: scheduledGame.away_team_name,
      home_score: simResult.home_score,
      away_score: simResult.away_score,
      is_user_game: isUserGame,
      is_preseason: true
    });
  }

  return { gameDateStr, results, userGameResult };
}
