import { pool } from '../db/pool';
import { simulateGame, simulateGameFast } from '../simulation';
import { loadTeamForSimulation } from './simulation';
import { saveCompleteGameResult, savePreseasonGameMinimal, GameResult } from './gamePersistence';
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

  for (const scheduledGame of gamesResult.rows) {
    const claimResult = await pool.query(
      `UPDATE schedule SET status = 'simulating'
       WHERE id = $1 AND status = 'scheduled'
       RETURNING *`,
      [scheduledGame.id]
    );

    if (claimResult.rows.length === 0) {
      continue;
    }

    const isUserGame = scheduledGame.home_team_id === userTeamId ||
                       scheduledGame.away_team_id === userTeamId;

    try {
      const homeTeam = teamCache.get(scheduledGame.home_team_id)!;
      const awayTeam = teamCache.get(scheduledGame.away_team_id)!;
      const simResult = isPreseason
        ? simulateGameFast(homeTeam, awayTeam)
        : simulateGame(homeTeam, awayTeam);

      const gameResult = buildGameResult(simResult);

      await withTransaction(async (client) => {
        if (isPreseason) {
          await savePreseasonGameMinimal(gameResult, seasonId, client, gameDateStr);
        } else {
          await saveCompleteGameResult(
            gameResult,
            seasonId,
            { id: homeTeam.id, starters: homeTeam.starters },
            { id: awayTeam.id, starters: awayTeam.starters },
            updateStandings,
            client,
            false,
            gameDateStr
          );
        }

        await client.query(
          `UPDATE schedule SET status = 'completed', game_id = $1, is_user_game = $2
           WHERE id = $3`,
          [simResult.id, isUserGame, scheduledGame.id]
        );
      });

      if (isUserGame) {
        userGameResult = buildUserGameResult(simResult, scheduledGame, userTeamId);
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
    } catch (error) {
      console.error(`Failed to simulate game ${scheduledGame.id}:`, error);
      await pool.query(
        `UPDATE schedule SET status = 'scheduled' WHERE id = $1`,
        [scheduledGame.id]
      );
    }
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
    gameDay: number;
    result: GameResult;
    homeTeamId: string;
    awayTeamId: string;
    isUserGame: boolean;
  }> = [];

  for (const game of gamesResult.rows) {
    const homeTeam = teamCache.get(game.home_team_id)!;
    const awayTeam = teamCache.get(game.away_team_id)!;
    const simResult = simulateGameFast(homeTeam, awayTeam);
    const isUserGame = game.home_team_id === userTeamId || game.away_team_id === userTeamId;

    simulatedGames.push({
      scheduleId: game.id,
      gameDay: game.game_day,
      result: buildGameResult(simResult),
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      isUserGame
    });
  }

  // Bulk insert all results in a single transaction
  let userWins = 0;
  let userLosses = 0;

  await withTransaction(async (client) => {
    // Bulk insert games only (skip quarters, team stats, player stats for preseason)
    if (simulatedGames.length > 0) {
      const gameValues: any[] = [];
      const gamePlaceholders: string[] = [];
      for (let i = 0; i < simulatedGames.length; i++) {
        const g = simulatedGames[i];
        const gameDate = calculateGameDate(g.gameDay);
        const offset = i * 10;
        gamePlaceholders.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8}, $${offset+9}, $${offset+10}, 'completed', NOW())`);
        gameValues.push(g.result.id, seasonId, g.homeTeamId, g.awayTeamId, g.result.home_score, g.result.away_score, g.result.winner_id, g.result.is_overtime, g.result.overtime_periods, gameDate);
      }
      await client.query(
        `INSERT INTO games (id, season_id, home_team_id, away_team_id, home_score, away_score, winner_id, is_overtime, overtime_periods, game_date, status, completed_at)
         VALUES ${gamePlaceholders.join(', ')}
         ON CONFLICT (id) DO NOTHING`,
        gameValues
      );
    }

    // Bulk update schedule status
    const scheduleIds = simulatedGames.map(g => g.scheduleId);
    const gameIdUpdates = simulatedGames.map(g => `WHEN id = '${g.scheduleId}' THEN '${g.result.id}'`).join(' ');
    const userGameUpdates = simulatedGames.map(g => `WHEN id = '${g.scheduleId}' THEN ${g.isUserGame}`).join(' ');
    await client.query(
      `UPDATE schedule SET status = 'completed', game_id = CASE ${gameIdUpdates} END, is_user_game = CASE ${userGameUpdates} END WHERE id = ANY($1)`,
      [scheduleIds]
    );

    // Count user wins/losses
    for (const g of simulatedGames) {
      if (g.isUserGame) {
        if (g.result.winner_id === userTeamId) userWins++;
        else userLosses++;
      }
    }
  });

  return { games_played: simulatedGames.length, user_wins: userWins, user_losses: userLosses };
}
