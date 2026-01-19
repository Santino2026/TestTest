import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from './simulation';
import { saveCompleteGameResult, GameResult } from './gamePersistence';
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

  const gamesResult = await pool.query(
    `SELECT s.*, ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_date = $2 AND s.status = 'scheduled'
       AND (s.is_preseason = $3 OR ($3 = FALSE AND s.is_preseason IS NULL))`,
    [seasonId, gameDateStr, isPreseason]
  );

  const results: GameSimResult[] = [];
  let userGameResult: UserGameResult | null = null;

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
      const homeTeam = await loadTeamForSimulation(scheduledGame.home_team_id);
      const awayTeam = await loadTeamForSimulation(scheduledGame.away_team_id);
      const simResult = simulateGame(homeTeam, awayTeam);

      const gameResult = buildGameResult(simResult);

      await withTransaction(async (client) => {
        await saveCompleteGameResult(
          gameResult,
          seasonId,
          { id: homeTeam.id, starters: homeTeam.starters },
          { id: awayTeam.id, starters: awayTeam.starters },
          updateStandings,
          client
        );

        await client.query(
          `UPDATE schedule SET status = 'completed', game_id = $1, is_user_game = $2
           WHERE id = $3`,
          [simResult.id, isUserGame, scheduledGame.id]
        );
      });

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
    }))
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
