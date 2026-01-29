import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { GameResult, TeamStats, PlayerGameStats, SimulatedTeam, PlayoffGameResult, DbConnection } from './types';

// Types for batch operations
export interface BatchGameData {
  result: GameResult;
  seasonId: string;
  gameDate: string;
  homeStarters: string[];
  awayStarters: string[];
  isPlayoff?: boolean;
}

// Batch insert functions for performance optimization
export async function batchInsertGames(
  games: BatchGameData[],
  db: DbConnection,
  isPlayoff: boolean = false
): Promise<void> {
  if (games.length === 0) return;

  const values: any[] = [];
  const placeholders: string[] = [];

  for (let i = 0; i < games.length; i++) {
    const { result, seasonId, gameDate } = games[i];
    const offset = i * 10;
    placeholders.push(
      `($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8}, $${offset+9}, $${offset+10}, 'completed', ${isPlayoff}, NOW())`
    );
    values.push(
      result.id, seasonId, result.home_team_id, result.away_team_id,
      result.home_score, result.away_score, result.winner_id,
      result.is_overtime, result.overtime_periods, gameDate
    );
  }

  await db.query(
    `INSERT INTO games (id, season_id, home_team_id, away_team_id, home_score, away_score, winner_id, is_overtime, overtime_periods, game_date, status, is_playoff, completed_at)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (id) DO NOTHING`,
    values
  );
}

export async function batchInsertQuarters(
  games: BatchGameData[],
  db: DbConnection
): Promise<void> {
  const values: any[] = [];
  const placeholders: string[] = [];
  let idx = 0;

  for (const { result } of games) {
    for (const q of result.quarters) {
      const offset = idx * 4;
      placeholders.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4})`);
      values.push(result.id, q.quarter, q.home_points, q.away_points);
      idx++;
    }
  }

  if (values.length === 0) return;

  await db.query(
    `INSERT INTO game_quarters (game_id, quarter, home_points, away_points)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (game_id, quarter) DO NOTHING`,
    values
  );
}

export async function batchInsertTeamGameStats(
  games: BatchGameData[],
  db: DbConnection
): Promise<void> {
  const values: any[] = [];
  const placeholders: string[] = [];
  let idx = 0;

  for (const { result } of games) {
    const statsArray: Array<{ stats: TeamStats; teamId: string; isHome: boolean }> = [
      { stats: result.home_stats, teamId: result.home_team_id, isHome: true },
      { stats: result.away_stats, teamId: result.away_team_id, isHome: false }
    ];

    for (const { stats, teamId, isHome } of statsArray) {
      const offset = idx * 24;
      placeholders.push(
        `($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8}, $${offset+9}, $${offset+10}, $${offset+11}, $${offset+12}, $${offset+13}, $${offset+14}, $${offset+15}, $${offset+16}, $${offset+17}, $${offset+18}, $${offset+19}, $${offset+20}, $${offset+21}, $${offset+22}, $${offset+23}, $${offset+24})`
      );
      values.push(
        result.id, teamId, isHome, stats.points, stats.fgm, stats.fga, stats.fg_pct,
        stats.three_pm, stats.three_pa, stats.three_pct, stats.ftm, stats.fta, stats.ft_pct,
        stats.oreb, stats.dreb, stats.rebounds, stats.assists, stats.steals, stats.blocks,
        stats.turnovers, stats.fouls, stats.fast_break_points || 0, stats.points_in_paint || 0, stats.second_chance_points || 0
      );
      idx++;
    }
  }

  if (values.length === 0) return;

  await db.query(
    `INSERT INTO team_game_stats (game_id, team_id, is_home, points, fgm, fga, fg_pct, three_pm, three_pa, three_pct, ftm, fta, ft_pct, oreb, dreb, rebounds, assists, steals, blocks, turnovers, fouls, fast_break_points, points_in_paint, second_chance_points)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (game_id, team_id) DO NOTHING`,
    values
  );
}

const PLAYER_BATCH_SIZE = 100;

export async function batchInsertPlayerGameStats(
  games: BatchGameData[],
  db: DbConnection
): Promise<void> {
  // Collect all player stats
  const allPlayerStats: Array<{ gameId: string; ps: PlayerGameStats; teamId: string; isStarter: boolean }> = [];

  for (const { result, homeStarters, awayStarters } of games) {
    for (const ps of result.home_player_stats) {
      if (ps.minutes > 0) {
        allPlayerStats.push({
          gameId: result.id,
          ps,
          teamId: result.home_team_id,
          isStarter: homeStarters.includes(ps.player_id)
        });
      }
    }
    for (const ps of result.away_player_stats) {
      if (ps.minutes > 0) {
        allPlayerStats.push({
          gameId: result.id,
          ps,
          teamId: result.away_team_id,
          isStarter: awayStarters.includes(ps.player_id)
        });
      }
    }
  }

  // Insert in batches to avoid parameter limits
  for (let i = 0; i < allPlayerStats.length; i += PLAYER_BATCH_SIZE) {
    const batch = allPlayerStats.slice(i, i + PLAYER_BATCH_SIZE);
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const { gameId, ps, teamId, isStarter } = batch[j];
      const offset = j * 21;
      placeholders.push(
        `($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8}, $${offset+9}, $${offset+10}, $${offset+11}, $${offset+12}, $${offset+13}, $${offset+14}, $${offset+15}, $${offset+16}, $${offset+17}, $${offset+18}, $${offset+19}, $${offset+20}, $${offset+21})`
      );
      values.push(
        gameId, ps.player_id, teamId, ps.minutes, ps.points, ps.fgm, ps.fga, ps.three_pm, ps.three_pa,
        ps.ftm, ps.fta, ps.oreb, ps.dreb, ps.rebounds, ps.assists, ps.steals, ps.blocks,
        ps.turnovers, ps.fouls, ps.plus_minus, isStarter
      );
    }

    await db.query(
      `INSERT INTO player_game_stats (game_id, player_id, team_id, minutes, points, fgm, fga, three_pm, three_pa, ftm, fta, oreb, dreb, rebounds, assists, steals, blocks, turnovers, fouls, plus_minus, is_starter)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (game_id, player_id) DO NOTHING`,
      values
    );
  }
}

// Unified batch save function for all game types
export async function saveGameResultsBatch(
  games: BatchGameData[],
  db: DbConnection,
  isPlayoff: boolean = false
): Promise<void> {
  if (games.length === 0) return;

  await batchInsertGames(games, db, isPlayoff);
  await batchInsertQuarters(games, db);
  await batchInsertTeamGameStats(games, db);
  await batchInsertPlayerGameStats(games, db);
}

export async function saveGameResult(
  result: GameResult,
  seasonId: string,
  homeTeam: SimulatedTeam,
  awayTeam: SimulatedTeam,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  await db.query(
    `INSERT INTO games (id, season_id, home_team_id, away_team_id, home_score, away_score,
                       winner_id, is_overtime, overtime_periods, status, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [result.id, seasonId, result.home_team_id, result.away_team_id,
     result.home_score, result.away_score, result.winner_id,
     result.is_overtime, result.overtime_periods]
  );

  // Batch insert quarters
  if (result.quarters.length > 0) {
    await insertQuartersBatch(db, result.id, result.quarters);
  }

  await insertTeamGameStats(db, result.id, result.home_team_id, result.home_stats, true);
  await insertTeamGameStats(db, result.id, result.away_team_id, result.away_stats, false);

  // Batch insert player stats
  const allPlayerStats = [
    ...result.home_player_stats.filter(ps => ps.minutes > 0).map(ps => ({
      ...ps,
      teamId: result.home_team_id,
      isStarter: homeTeam.starters.some(s => s.id === ps.player_id)
    })),
    ...result.away_player_stats.filter(ps => ps.minutes > 0).map(ps => ({
      ...ps,
      teamId: result.away_team_id,
      isStarter: awayTeam.starters.some(s => s.id === ps.player_id)
    }))
  ];

  if (allPlayerStats.length > 0) {
    await insertPlayerGameStatsBatch(db, result.id, allPlayerStats);
  }
}

async function insertTeamGameStats(
  db: DbConnection,
  gameId: string,
  teamId: string,
  stats: TeamStats,
  isHome: boolean
): Promise<void> {
  await db.query(
    `INSERT INTO team_game_stats (game_id, team_id, is_home, points, fgm, fga, fg_pct,
                                  three_pm, three_pa, three_pct, ftm, fta, ft_pct,
                                  oreb, dreb, rebounds, assists, steals, blocks,
                                  turnovers, fouls)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
     ON CONFLICT DO NOTHING`,
    [gameId, teamId, isHome, stats.points,
     stats.fgm, stats.fga, stats.fg_pct,
     stats.three_pm, stats.three_pa, stats.three_pct,
     stats.ftm, stats.fta, stats.ft_pct,
     stats.oreb, stats.dreb, stats.rebounds,
     stats.assists, stats.steals, stats.blocks,
     stats.turnovers, stats.fouls]
  );
}

async function insertQuartersBatch(
  db: DbConnection,
  gameId: string,
  quarters: Array<{ quarter: number; home_points: number; away_points: number }>
): Promise<void> {
  const values: (string | number)[] = [];
  const placeholders: string[] = [];

  for (let i = 0; i < quarters.length; i++) {
    const q = quarters[i];
    const offset = i * 4;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
    values.push(gameId, q.quarter, q.home_points, q.away_points);
  }

  await db.query(
    `INSERT INTO game_quarters (game_id, quarter, home_points, away_points)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (game_id, quarter) DO NOTHING`,
    values
  );
}

async function insertPlayerGameStatsBatch(
  db: DbConnection,
  gameId: string,
  stats: Array<PlayerGameStats & { teamId: string; isStarter: boolean }>
): Promise<void> {
  const values: (string | number | boolean)[] = [];
  const placeholders: string[] = [];

  for (let i = 0; i < stats.length; i++) {
    const ps = stats[i];
    const offset = i * 21;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21})`
    );
    values.push(
      gameId, ps.player_id, ps.teamId, ps.minutes, ps.points,
      ps.fgm, ps.fga, ps.three_pm, ps.three_pa, ps.ftm, ps.fta,
      ps.oreb, ps.dreb, ps.rebounds, ps.assists, ps.steals, ps.blocks,
      ps.turnovers, ps.fouls, ps.plus_minus, ps.isStarter
    );
  }

  await db.query(
    `INSERT INTO player_game_stats
     (game_id, player_id, team_id, minutes, points, fgm, fga, three_pm, three_pa,
      ftm, fta, oreb, dreb, rebounds, assists, steals, blocks, turnovers, fouls,
      plus_minus, is_starter)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (game_id, player_id) DO NOTHING`,
    values
  );
}

export async function savePlayoffGame(
  result: PlayoffGameResult,
  seasonId: string,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  await db.query(
    `INSERT INTO games (id, season_id, home_team_id, away_team_id, home_score, away_score,
                       winner_id, is_overtime, overtime_periods, status, is_playoff, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', true, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [result.id, seasonId, result.home_team_id, result.away_team_id,
     result.home_score, result.away_score, result.winner_id,
     result.is_overtime, result.overtime_periods]
  );

  if (result.quarters.length > 0) {
    await insertQuartersBatch(db, result.id, result.quarters);
  }
}
