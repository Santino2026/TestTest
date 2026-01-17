import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { GameResult, TeamStats, DbConnection } from './types';

export async function updateTeamSeasonStats(
  result: GameResult,
  seasonId: string,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;
  const homeWon = result.winner_id === result.home_team_id;

  await updateSingleTeamSeasonStats(db, result.home_team_id, seasonId,
    result.home_stats, result.away_stats.points, homeWon);

  await updateSingleTeamSeasonStats(db, result.away_team_id, seasonId,
    result.away_stats, result.home_stats.points, !homeWon);
}

async function updateSingleTeamSeasonStats(
  db: DbConnection,
  teamId: string,
  seasonId: string,
  stats: TeamStats,
  opponentPoints: number,
  won: boolean
): Promise<void> {
  await db.query(
    `INSERT INTO team_season_stats
     (team_id, season_id, games_played, wins, losses, points_for, points_against,
      fgm, fga, three_pm, three_pa, ftm, fta, oreb, dreb, assists, steals, blocks, turnovers)
     VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     ON CONFLICT (team_id, season_id) DO UPDATE SET
       games_played = team_season_stats.games_played + 1,
       wins = team_season_stats.wins + EXCLUDED.wins,
       losses = team_season_stats.losses + EXCLUDED.losses,
       points_for = team_season_stats.points_for + EXCLUDED.points_for,
       points_against = team_season_stats.points_against + EXCLUDED.points_against,
       fgm = team_season_stats.fgm + EXCLUDED.fgm,
       fga = team_season_stats.fga + EXCLUDED.fga,
       three_pm = team_season_stats.three_pm + EXCLUDED.three_pm,
       three_pa = team_season_stats.three_pa + EXCLUDED.three_pa,
       ftm = team_season_stats.ftm + EXCLUDED.ftm,
       fta = team_season_stats.fta + EXCLUDED.fta,
       oreb = team_season_stats.oreb + EXCLUDED.oreb,
       dreb = team_season_stats.dreb + EXCLUDED.dreb,
       assists = team_season_stats.assists + EXCLUDED.assists,
       steals = team_season_stats.steals + EXCLUDED.steals,
       blocks = team_season_stats.blocks + EXCLUDED.blocks,
       turnovers = team_season_stats.turnovers + EXCLUDED.turnovers,
       fg_pct = (team_season_stats.fgm + EXCLUDED.fgm)::float / NULLIF(team_season_stats.fga + EXCLUDED.fga, 0),
       three_pct = (team_season_stats.three_pm + EXCLUDED.three_pm)::float / NULLIF(team_season_stats.three_pa + EXCLUDED.three_pa, 0),
       ft_pct = (team_season_stats.ftm + EXCLUDED.ftm)::float / NULLIF(team_season_stats.fta + EXCLUDED.fta, 0),
       avg_point_diff = ((team_season_stats.points_for + EXCLUDED.points_for) - (team_season_stats.points_against + EXCLUDED.points_against))::float / (team_season_stats.games_played + 1),
       pace = 100.0,
       offensive_rating = CASE
         WHEN (team_season_stats.fga + EXCLUDED.fga) > 0 THEN
           ((team_season_stats.points_for + EXCLUDED.points_for)::float /
            NULLIF(
              (team_season_stats.fga + EXCLUDED.fga) -
              (team_season_stats.oreb + EXCLUDED.oreb) +
              (team_season_stats.turnovers + EXCLUDED.turnovers) +
              0.44 * (team_season_stats.fta + EXCLUDED.fta),
            0)) * 100
         ELSE 100
       END,
       defensive_rating = CASE
         WHEN (team_season_stats.fga + EXCLUDED.fga) > 0 THEN
           ((team_season_stats.points_against + EXCLUDED.points_against)::float /
            NULLIF(
              (team_season_stats.fga + EXCLUDED.fga) -
              (team_season_stats.oreb + EXCLUDED.oreb) +
              (team_season_stats.turnovers + EXCLUDED.turnovers) +
              0.44 * (team_season_stats.fta + EXCLUDED.fta),
            0)) * 100
         ELSE 100
       END,
       net_rating = CASE
         WHEN (team_season_stats.fga + EXCLUDED.fga) > 0 THEN
           (((team_season_stats.points_for + EXCLUDED.points_for) -
             (team_season_stats.points_against + EXCLUDED.points_against))::float /
            NULLIF(
              (team_season_stats.fga + EXCLUDED.fga) -
              (team_season_stats.oreb + EXCLUDED.oreb) +
              (team_season_stats.turnovers + EXCLUDED.turnovers) +
              0.44 * (team_season_stats.fta + EXCLUDED.fta),
            0)) * 100
         ELSE 0
       END,
       updated_at = NOW()`,
    [
      teamId, seasonId, won ? 1 : 0, won ? 0 : 1,
      stats.points, opponentPoints,
      stats.fgm, stats.fga, stats.three_pm, stats.three_pa,
      stats.ftm, stats.fta, stats.oreb, stats.dreb,
      stats.assists, stats.steals, stats.blocks, stats.turnovers
    ]
  );
}
