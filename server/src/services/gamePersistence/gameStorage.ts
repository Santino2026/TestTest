import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { GameResult, TeamStats, PlayerGameStats, SimulatedTeam, PlayoffGameResult, DbConnection } from './types';

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

  for (const quarter of result.quarters) {
    await db.query(
      `INSERT INTO game_quarters (game_id, quarter, home_points, away_points)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (game_id, quarter) DO NOTHING`,
      [result.id, quarter.quarter, quarter.home_points, quarter.away_points]
    );
  }

  await insertTeamGameStats(db, result.id, result.home_team_id, result.home_stats, true);
  await insertTeamGameStats(db, result.id, result.away_team_id, result.away_stats, false);

  for (const ps of result.home_player_stats) {
    if (ps.minutes > 0) {
      const isStarter = homeTeam.starters.some(s => s.id === ps.player_id);
      await insertPlayerGameStats(db, result.id, ps, result.home_team_id, isStarter);
    }
  }

  for (const ps of result.away_player_stats) {
    if (ps.minutes > 0) {
      const isStarter = awayTeam.starters.some(s => s.id === ps.player_id);
      await insertPlayerGameStats(db, result.id, ps, result.away_team_id, isStarter);
    }
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

async function insertPlayerGameStats(
  db: DbConnection,
  gameId: string,
  ps: PlayerGameStats,
  teamId: string,
  isStarter: boolean
): Promise<void> {
  await db.query(
    `INSERT INTO player_game_stats
     (game_id, player_id, team_id, minutes, points, fgm, fga, three_pm, three_pa,
      ftm, fta, oreb, dreb, rebounds, assists, steals, blocks, turnovers, fouls,
      plus_minus, is_starter)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
     ON CONFLICT (game_id, player_id) DO NOTHING`,
    [gameId, ps.player_id, teamId, ps.minutes, ps.points,
     ps.fgm, ps.fga, ps.three_pm, ps.three_pa, ps.ftm, ps.fta,
     ps.oreb, ps.dreb, ps.rebounds, ps.assists, ps.steals, ps.blocks,
     ps.turnovers, ps.fouls, ps.plus_minus, isStarter]
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

  for (const quarter of result.quarters) {
    await db.query(
      `INSERT INTO game_quarters (game_id, quarter, home_points, away_points)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [result.id, quarter.quarter, quarter.home_points, quarter.away_points]
    );
  }
}
