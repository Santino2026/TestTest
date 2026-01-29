import { pool } from '../db/pool';
import { simulateGame, simulateGameFast } from '../simulation';
import { loadTeamForSimulation } from './simulation';
import {
  saveCompleteGameResult,
  GameResult,
  BatchGameData,
  saveGameResultsBatch,
  updateTeamSeasonStatsBatch,
  updatePlayerSeasonStatsBatch
} from './gamePersistence';
import { updateStandingsAfterGame } from './gamePersistence/standings';
import { SEASON_START_DATE } from '../constants';
import { withTransaction } from '../db/transactions';

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

interface SimulateOptions {
  isPreseason: boolean;
  updateStandings: boolean;
}

export async function simulateDayGames(franchise: FranchiseContext): Promise<SimulationResult> {
  return simulateGamesForDay(franchise, { isPreseason: false, updateStandings: true });
}

export async function simulatePreseasonDayGames(franchise: FranchiseContext): Promise<SimulationResult> {
  return simulateGamesForDay(franchise, { isPreseason: true, updateStandings: false });
}

async function simulateGamesForDay(
  franchise: FranchiseContext,
  options: SimulateOptions
): Promise<SimulationResult> {
  const { season_id: seasonId, current_day: currentDay, team_id: userTeamId } = franchise;
  const { isPreseason, updateStandings } = options;

  const gameDateStr = calculateGameDate(currentDay);

  // Recover any games stuck in 'simulating' state from interrupted runs
  await pool.query(
    `UPDATE schedule SET status = 'scheduled'
     WHERE season_id = $1 AND game_day = $2 AND status = 'simulating'`,
    [seasonId, currentDay]
  );

  const gamesResult = await pool.query(
    `SELECT s.*, ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_day = $2 AND s.status = 'scheduled'
       AND (s.is_preseason = $3 OR ($3 = FALSE AND s.is_preseason IS NULL))`,
    [seasonId, currentDay, isPreseason]
  );

  if (gamesResult.rows.length === 0) {
    return { gameDateStr, results: [], userGameResult: null };
  }

  const results: GameSimResult[] = [];
  let userGameResult: UserGameResult | null = null;

  // Batch load all teams upfront
  const teamIds = new Set<string>();
  for (const game of gamesResult.rows) {
    teamIds.add(game.home_team_id);
    teamIds.add(game.away_team_id);
  }

  const teamCache = new Map<string, Awaited<ReturnType<typeof loadTeamForSimulation>>>();
  await Promise.all(
    Array.from(teamIds).map(async (teamId) => {
      const team = await loadTeamForSimulation(teamId);
      teamCache.set(teamId, team);
    })
  );

  // Claim all games atomically
  const scheduleIds = gamesResult.rows.map(g => g.id);
  await pool.query(
    `UPDATE schedule SET status = 'simulating' WHERE id = ANY($1) AND status = 'scheduled'`,
    [scheduleIds]
  );

  // Simulate all games (CPU work)
  const simulatedGames: Array<{
    scheduleId: string;
    scheduledGame: any;
    gameData: BatchGameData;
    simResult: any;
    isUserGame: boolean;
  }> = [];

  for (const scheduledGame of gamesResult.rows) {
    const homeTeam = teamCache.get(scheduledGame.home_team_id)!;
    const awayTeam = teamCache.get(scheduledGame.away_team_id)!;
    const isUserGame = scheduledGame.home_team_id === userTeamId || scheduledGame.away_team_id === userTeamId;

    const simResult = isPreseason
      ? simulateGameFast(homeTeam, awayTeam)
      : simulateGame(homeTeam, awayTeam);

    const gameResult = buildGameResult(simResult);

    simulatedGames.push({
      scheduleId: scheduledGame.id,
      scheduledGame,
      gameData: {
        result: gameResult,
        seasonId,
        gameDate: gameDateStr,
        homeStarters: homeTeam.starters.map(s => s.id),
        awayStarters: awayTeam.starters.map(s => s.id)
      },
      simResult,
      isUserGame
    });
  }

  // Batch save all results in a single transaction
  try {
    await withTransaction(async (client) => {
      const batchData = simulatedGames.map(g => g.gameData);

      // Batch insert game data
      await saveGameResultsBatch(batchData, client);

      // Update standings if needed (still sequential due to last_10_wins subquery)
      if (updateStandings) {
        for (const { gameData } of simulatedGames) {
          await updateStandingsAfterGame(gameData.result, seasonId, client);
        }
      }

      // Batch update season stats for regular season
      if (!isPreseason) {
        await updateTeamSeasonStatsBatch(batchData, client);
        await updatePlayerSeasonStatsBatch(batchData, client);
      }

      // Batch update schedule status
      const scheduleUpdates = simulatedGames.map(g =>
        `WHEN id = '${g.scheduleId}' THEN '${g.gameData.result.id}'`
      ).join(' ');
      const userGameUpdates = simulatedGames.map(g =>
        `WHEN id = '${g.scheduleId}' THEN ${g.isUserGame}`
      ).join(' ');
      await client.query(
        `UPDATE schedule SET status = 'completed', game_id = CASE ${scheduleUpdates} END, is_user_game = CASE ${userGameUpdates} END WHERE id = ANY($1)`,
        [scheduleIds]
      );
    });

    // Build results after successful transaction
    for (const { scheduledGame, simResult, isUserGame } of simulatedGames) {
      if (isUserGame) {
        userGameResult = buildUserGameResult(simResult, scheduledGame, userTeamId);

        if (isPreseason) {
          await updatePreseasonRecord(franchise.id, simResult.winner_id === userTeamId);
        }
      }

      results.push({
        game_id: simResult.id,
        home_team: scheduledGame.home_team_name,
        away_team: scheduledGame.away_team_name,
        home_score: simResult.home_score,
        away_score: simResult.away_score,
        is_user_game: isUserGame,
        is_preseason: isPreseason || undefined
      });
    }
  } catch (error) {
    console.error('Failed to save simulated games:', error);
    // Reset all games to scheduled
    await pool.query(
      `UPDATE schedule SET status = 'scheduled' WHERE id = ANY($1)`,
      [scheduleIds]
    );
    throw error;
  }

  return { gameDateStr, results, userGameResult };
}

function calculateGameDate(currentDay: number): string {
  const seasonStart = new Date(SEASON_START_DATE);
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + currentDay - 1);
  return gameDate.toISOString().split('T')[0];
}

function buildGameResult(simResult: any): GameResult {
  return {
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
}

function buildUserGameResult(
  simResult: any,
  scheduledGame: any,
  userTeamId: string
): UserGameResult {
  const userIsHome = scheduledGame.home_team_id === userTeamId;
  return {
    game_id: simResult.id,
    won: simResult.winner_id === userTeamId,
    user_score: userIsHome ? simResult.home_score : simResult.away_score,
    opponent_score: userIsHome ? simResult.away_score : simResult.home_score,
    opponent_name: userIsHome ? scheduledGame.away_team_name : scheduledGame.home_team_name,
    is_overtime: simResult.is_overtime,
    overtime_periods: simResult.overtime_periods
  };
}

async function updatePreseasonRecord(franchiseId: string, won: boolean): Promise<void> {
  const column = won ? 'preseason_wins' : 'preseason_losses';
  await pool.query(
    `UPDATE franchises SET ${column} = COALESCE(${column}, 0) + 1 WHERE id = $1`,
    [franchiseId]
  );
}

// Bulk preseason simulation - simulates all games then bulk inserts
export async function simulateAllPreseasonGamesBulk(
  franchise: FranchiseContext
): Promise<{ games_played: number; user_wins: number; user_losses: number }> {
  const { season_id: seasonId, team_id: userTeamId } = franchise;

  // Get all remaining preseason games
  const gamesResult = await pool.query(
    `SELECT s.*, ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.is_preseason = true AND s.status = 'scheduled'
     ORDER BY s.game_day`,
    [seasonId]
  );

  if (gamesResult.rows.length === 0) {
    return { games_played: 0, user_wins: 0, user_losses: 0 };
  }

  // Batch load all teams upfront
  const teamIds = new Set<string>();
  for (const game of gamesResult.rows) {
    teamIds.add(game.home_team_id);
    teamIds.add(game.away_team_id);
  }

  const teamCache = new Map<string, Awaited<ReturnType<typeof loadTeamForSimulation>>>();
  await Promise.all(
    Array.from(teamIds).map(async (teamId) => {
      const team = await loadTeamForSimulation(teamId);
      teamCache.set(teamId, team);
    })
  );

  // Simulate all games (CPU work - fast with simulateGameFast)
  const simulatedGames: Array<{
    scheduleId: string;
    gameData: BatchGameData;
    isUserGame: boolean;
  }> = [];

  for (const game of gamesResult.rows) {
    const homeTeam = teamCache.get(game.home_team_id)!;
    const awayTeam = teamCache.get(game.away_team_id)!;
    const simResult = simulateGameFast(homeTeam, awayTeam);
    const isUserGame = game.home_team_id === userTeamId || game.away_team_id === userTeamId;

    simulatedGames.push({
      scheduleId: game.id,
      gameData: {
        result: buildGameResult(simResult),
        seasonId,
        gameDate: calculateGameDate(game.game_day),
        homeStarters: homeTeam.starters.map(s => s.id),
        awayStarters: awayTeam.starters.map(s => s.id)
      },
      isUserGame
    });
  }

  // Bulk insert all results in a single transaction
  let userWins = 0;
  let userLosses = 0;

  await withTransaction(async (client) => {
    const batchData = simulatedGames.map(g => g.gameData);

    // Use shared batch insert functions
    await saveGameResultsBatch(batchData, client);

    // Bulk update schedule status
    const scheduleIds = simulatedGames.map(g => g.scheduleId);
    const gameIdUpdates = simulatedGames.map(g => `WHEN id = '${g.scheduleId}' THEN '${g.gameData.result.id}'`).join(' ');
    const userGameUpdates = simulatedGames.map(g => `WHEN id = '${g.scheduleId}' THEN ${g.isUserGame}`).join(' ');
    await client.query(
      `UPDATE schedule SET status = 'completed', game_id = CASE ${gameIdUpdates} END, is_user_game = CASE ${userGameUpdates} END WHERE id = ANY($1)`,
      [scheduleIds]
    );

    // Count user wins/losses
    for (const g of simulatedGames) {
      if (g.isUserGame) {
        if (g.gameData.result.winner_id === userTeamId) userWins++;
        else userLosses++;
      }
    }
  });

  return { games_played: simulatedGames.length, user_wins: userWins, user_losses: userLosses };
}
