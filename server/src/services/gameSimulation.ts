import { pool } from '../db/pool';
import { simulateGame, SimTeam } from '../simulation';
import { loadTeamForSimulation } from './simulation';
import { saveCompleteGameResult, GameResult } from './gamePersistence';
import { SEASON_START_DATE } from '../constants';
import { withTransaction } from '../db/transactions';

interface SimulationResult {
  gameDateStr: string;
  results: GameSimResult[];
  userGameResult: UserGameResult | null;
}

interface AllPreseasonResult {
  daysSimulated: number;
  gamesPlayed: number;
  userGames: GameSimResult[];
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
     WHERE s.season_id = $1 AND s.game_day = $2 AND s.status = 'scheduled'
       AND (s.is_preseason = $3 OR ($3 = FALSE AND s.is_preseason IS NULL))`,
    [seasonId, currentDay, isPreseason]
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

export async function simulateAllPreseasonGames(franchise: FranchiseContext): Promise<AllPreseasonResult> {
  const { season_id: seasonId, current_day: startDay, team_id: userTeamId, id: franchiseId } = franchise;

  // Get all remaining preseason games in one query
  const gamesResult = await pool.query(
    `SELECT s.*, ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_day >= $2 AND s.game_day <= 0
       AND s.status = 'scheduled' AND s.is_preseason = TRUE
     ORDER BY s.game_day, s.id`,
    [seasonId, startDay]
  );

  if (gamesResult.rows.length === 0) {
    return { daysSimulated: 0, gamesPlayed: 0, userGames: [] };
  }

  // Collect unique team IDs
  const teamIds = new Set<string>();
  for (const game of gamesResult.rows) {
    teamIds.add(game.home_team_id);
    teamIds.add(game.away_team_id);
  }

  // Batch load all teams upfront
  const teamCache = new Map<string, SimTeam>();
  await Promise.all(
    Array.from(teamIds).map(async (teamId) => {
      const team = await loadTeamForSimulation(teamId);
      teamCache.set(teamId, team);
    })
  );

  const results: GameSimResult[] = [];
  const daysProcessed = new Set<number>();

  for (const scheduledGame of gamesResult.rows) {
    const claimResult = await pool.query(
      `UPDATE schedule SET status = 'simulating'
       WHERE id = $1 AND status = 'scheduled'
       RETURNING *`,
      [scheduledGame.id]
    );

    if (claimResult.rows.length === 0) continue;

    daysProcessed.add(scheduledGame.game_day);
    const isUserGame = scheduledGame.home_team_id === userTeamId || scheduledGame.away_team_id === userTeamId;

    try {
      // Clone cached teams to avoid mutation issues
      const homeTeam = cloneTeamForSim(teamCache.get(scheduledGame.home_team_id)!);
      const awayTeam = cloneTeamForSim(teamCache.get(scheduledGame.away_team_id)!);
      const simResult = simulateGame(homeTeam, awayTeam);

      const gameResult = buildGameResult(simResult);

      await withTransaction(async (client) => {
        await saveCompleteGameResult(
          gameResult,
          seasonId,
          { id: homeTeam.id, starters: homeTeam.starters },
          { id: awayTeam.id, starters: awayTeam.starters },
          false, // Never update standings for preseason
          client
        );

        await client.query(
          `UPDATE schedule SET status = 'completed', game_id = $1, is_user_game = $2
           WHERE id = $3`,
          [simResult.id, isUserGame, scheduledGame.id]
        );
      });

      if (isUserGame) {
        await updatePreseasonRecord(franchiseId, simResult.winner_id === userTeamId);
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
    } catch (error) {
      console.error(`Failed to simulate game ${scheduledGame.id}:`, error);
      await pool.query(
        `UPDATE schedule SET status = 'scheduled' WHERE id = $1`,
        [scheduledGame.id]
      );
    }
  }

  return {
    daysSimulated: daysProcessed.size,
    gamesPlayed: results.length,
    userGames: results.filter(r => r.is_user_game)
  };
}

function cloneTeamForSim(team: SimTeam): SimTeam {
  const starterIds = new Set(team.starters.map(s => s.id));
  const roster = team.roster.map(p => ({
    ...p,
    fatigue: 0,
    minutes_played: 0,
    fouls: 0,
    is_on_court: starterIds.has(p.id),
    stats: { points: 0, fgm: 0, fga: 0, three_pm: 0, three_pa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, plus_minus: 0, minutes: 0 }
  }));
  const starters = roster.filter(p => starterIds.has(p.id));
  const bench = roster.filter(p => !starterIds.has(p.id));
  return {
    ...team,
    roster,
    starters,
    bench,
    on_court: [...starters]
  };
}
