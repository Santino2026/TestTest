import { pool } from '../db/pool';
import { simulateGame, simulateGameFast } from '../simulation';
import { loadTeamForSimulation, loadTeamsForSimulationBulk } from './simulation';
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
        await saveCompleteGameResult(
          gameResult,
          seasonId,
          { id: homeTeam.id, starters: homeTeam.starters },
          { id: awayTeam.id, starters: awayTeam.starters },
          updateStandings,
          client,
          isPreseason,
          gameDateStr
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

  // Batch load all teams upfront (3 queries instead of 48)
  const teamIds = new Set<string>();
  for (const game of gamesResult.rows) {
    teamIds.add(game.home_team_id);
    teamIds.add(game.away_team_id);
  }

  const teamCache = await loadTeamsForSimulationBulk(Array.from(teamIds));

  // Simulate all games (CPU work - fast with simulateGameFast)
  const simulatedGames: Array<{
    scheduleId: string;
    gameDay: number;
    result: GameResult;
    homeTeamId: string;
    awayTeamId: string;
    isUserGame: boolean;
    homeStarters: string[];
    awayStarters: string[];
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
      isUserGame,
      homeStarters: homeTeam.starters.map(s => s.id),
      awayStarters: awayTeam.starters.map(s => s.id)
    });
  }

  // Bulk insert all results in a single transaction
  let userWins = 0;
  let userLosses = 0;

  await withTransaction(async (client) => {
    // Bulk insert games
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

    // Bulk insert quarters
    const quarterValues: any[] = [];
    const quarterPlaceholders: string[] = [];
    let qIdx = 0;
    for (const g of simulatedGames) {
      for (const q of g.result.quarters) {
        const offset = qIdx * 4;
        quarterPlaceholders.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4})`);
        quarterValues.push(g.result.id, q.quarter, q.home_points, q.away_points);
        qIdx++;
      }
    }
    if (quarterValues.length > 0) {
      await client.query(
        `INSERT INTO game_quarters (game_id, quarter, home_points, away_points)
         VALUES ${quarterPlaceholders.join(', ')}
         ON CONFLICT (game_id, quarter) DO NOTHING`,
        quarterValues
      );
    }

    // Bulk insert team stats
    const teamStatValues: any[] = [];
    const teamStatPlaceholders: string[] = [];
    let tsIdx = 0;
    for (const g of simulatedGames) {
      for (const [stats, teamId, isHome] of [[g.result.home_stats, g.homeTeamId, true], [g.result.away_stats, g.awayTeamId, false]] as const) {
        const offset = tsIdx * 24;
        teamStatPlaceholders.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8}, $${offset+9}, $${offset+10}, $${offset+11}, $${offset+12}, $${offset+13}, $${offset+14}, $${offset+15}, $${offset+16}, $${offset+17}, $${offset+18}, $${offset+19}, $${offset+20}, $${offset+21}, $${offset+22}, $${offset+23}, $${offset+24})`);
        teamStatValues.push(
          g.result.id, teamId, isHome, stats.points, stats.fgm, stats.fga, stats.fg_pct,
          stats.three_pm, stats.three_pa, stats.three_pct, stats.ftm, stats.fta, stats.ft_pct,
          stats.oreb, stats.dreb, stats.rebounds, stats.assists, stats.steals, stats.blocks,
          stats.turnovers, stats.fouls, stats.fast_break_points || 0, stats.points_in_paint || 0, stats.second_chance_points || 0
        );
        tsIdx++;
      }
    }
    if (teamStatValues.length > 0) {
      await client.query(
        `INSERT INTO team_game_stats (game_id, team_id, is_home, points, fgm, fga, fg_pct, three_pm, three_pa, three_pct, ftm, fta, ft_pct, oreb, dreb, rebounds, assists, steals, blocks, turnovers, fouls, fast_break_points, points_in_paint, second_chance_points)
         VALUES ${teamStatPlaceholders.join(', ')}
         ON CONFLICT (game_id, team_id) DO NOTHING`,
        teamStatValues
      );
    }

    // Bulk insert player stats (batch in chunks to avoid parameter limits)
    const allPlayerStats: Array<{ gameId: string; ps: any; teamId: string; isStarter: boolean }> = [];
    for (const g of simulatedGames) {
      for (const ps of g.result.home_player_stats) {
        if (ps.minutes > 0) {
          allPlayerStats.push({ gameId: g.result.id, ps, teamId: g.homeTeamId, isStarter: g.homeStarters.includes(ps.player_id) });
        }
      }
      for (const ps of g.result.away_player_stats) {
        if (ps.minutes > 0) {
          allPlayerStats.push({ gameId: g.result.id, ps, teamId: g.awayTeamId, isStarter: g.awayStarters.includes(ps.player_id) });
        }
      }
    }

    const PLAYER_BATCH_SIZE = 500;
    for (let i = 0; i < allPlayerStats.length; i += PLAYER_BATCH_SIZE) {
      const batch = allPlayerStats.slice(i, i + PLAYER_BATCH_SIZE);
      const playerValues: any[] = [];
      const playerPlaceholders: string[] = [];
      for (let j = 0; j < batch.length; j++) {
        const { gameId, ps, teamId, isStarter } = batch[j];
        const offset = j * 21;
        playerPlaceholders.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8}, $${offset+9}, $${offset+10}, $${offset+11}, $${offset+12}, $${offset+13}, $${offset+14}, $${offset+15}, $${offset+16}, $${offset+17}, $${offset+18}, $${offset+19}, $${offset+20}, $${offset+21})`);
        playerValues.push(
          gameId, ps.player_id, teamId, ps.minutes, ps.points, ps.fgm, ps.fga, ps.three_pm, ps.three_pa,
          ps.ftm, ps.fta, ps.oreb, ps.dreb, ps.rebounds, ps.assists, ps.steals, ps.blocks,
          ps.turnovers, ps.fouls, ps.plus_minus, isStarter
        );
      }
      await client.query(
        `INSERT INTO player_game_stats (game_id, player_id, team_id, minutes, points, fgm, fga, three_pm, three_pa, ftm, fta, oreb, dreb, rebounds, assists, steals, blocks, turnovers, fouls, plus_minus, is_starter)
         VALUES ${playerPlaceholders.join(', ')}
         ON CONFLICT (game_id, player_id) DO NOTHING`,
        playerValues
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
