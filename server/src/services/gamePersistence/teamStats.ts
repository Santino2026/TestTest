import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { GameResult, TeamStats, DbConnection } from './types';
import { BatchGameData } from './gameStorage';

// Batch update team season stats for multiple games
export async function updateTeamSeasonStatsBatch(
  games: BatchGameData[],
  db: DbConnection
): Promise<void> {
  if (games.length === 0) return;

  const seasonId = games[0].seasonId;

  // Collect team updates - aggregate stats per team across all games
  const teamUpdates = new Map<string, {
    wins: number;
    losses: number;
    minutes: number;
    pointsFor: number;
    pointsAgainst: number;
    fgm: number;
    fga: number;
    threePm: number;
    threePa: number;
    ftm: number;
    fta: number;
    oreb: number;
    dreb: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
  }>();

  function getOrCreate(teamId: string) {
    if (!teamUpdates.has(teamId)) {
      teamUpdates.set(teamId, {
        wins: 0, losses: 0, minutes: 0, pointsFor: 0, pointsAgainst: 0,
        fgm: 0, fga: 0, threePm: 0, threePa: 0, ftm: 0, fta: 0,
        oreb: 0, dreb: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0
      });
    }
    return teamUpdates.get(teamId)!;
  }

  for (const { result } of games) {
    const homeWon = result.winner_id === result.home_team_id;
    const homeMinutes = result.home_player_stats.reduce((sum, ps) => sum + ps.minutes, 0);
    const awayMinutes = result.away_player_stats.reduce((sum, ps) => sum + ps.minutes, 0);

    // Home team
    const homeUpdate = getOrCreate(result.home_team_id);
    if (homeWon) homeUpdate.wins++; else homeUpdate.losses++;
    homeUpdate.minutes += Math.round(homeMinutes);
    homeUpdate.pointsFor += result.home_stats.points;
    homeUpdate.pointsAgainst += result.away_stats.points;
    homeUpdate.fgm += result.home_stats.fgm;
    homeUpdate.fga += result.home_stats.fga;
    homeUpdate.threePm += result.home_stats.three_pm;
    homeUpdate.threePa += result.home_stats.three_pa;
    homeUpdate.ftm += result.home_stats.ftm;
    homeUpdate.fta += result.home_stats.fta;
    homeUpdate.oreb += result.home_stats.oreb;
    homeUpdate.dreb += result.home_stats.dreb;
    homeUpdate.assists += result.home_stats.assists;
    homeUpdate.steals += result.home_stats.steals;
    homeUpdate.blocks += result.home_stats.blocks;
    homeUpdate.turnovers += result.home_stats.turnovers;

    // Away team
    const awayUpdate = getOrCreate(result.away_team_id);
    if (!homeWon) awayUpdate.wins++; else awayUpdate.losses++;
    awayUpdate.minutes += Math.round(awayMinutes);
    awayUpdate.pointsFor += result.away_stats.points;
    awayUpdate.pointsAgainst += result.home_stats.points;
    awayUpdate.fgm += result.away_stats.fgm;
    awayUpdate.fga += result.away_stats.fga;
    awayUpdate.threePm += result.away_stats.three_pm;
    awayUpdate.threePa += result.away_stats.three_pa;
    awayUpdate.ftm += result.away_stats.ftm;
    awayUpdate.fta += result.away_stats.fta;
    awayUpdate.oreb += result.away_stats.oreb;
    awayUpdate.dreb += result.away_stats.dreb;
    awayUpdate.assists += result.away_stats.assists;
    awayUpdate.steals += result.away_stats.steals;
    awayUpdate.blocks += result.away_stats.blocks;
    awayUpdate.turnovers += result.away_stats.turnovers;
  }

  // Convert to arrays for UNNEST
  const teamIds = Array.from(teamUpdates.keys());
  const updates = teamIds.map(id => teamUpdates.get(id)!);

  await db.query(
    `INSERT INTO team_season_stats
     (team_id, season_id, games_played, wins, losses, minutes, points_for, points_against,
      fgm, fga, three_pm, three_pa, ftm, fta, oreb, dreb, assists, steals, blocks, turnovers)
     SELECT
       u.team_id, $1, u.wins + u.losses, u.wins, u.losses, u.minutes, u.points_for, u.points_against,
       u.fgm, u.fga, u.three_pm, u.three_pa, u.ftm, u.fta, u.oreb, u.dreb,
       u.assists, u.steals, u.blocks, u.turnovers
     FROM UNNEST($2::uuid[], $3::int[], $4::int[], $5::int[], $6::int[], $7::int[],
                 $8::int[], $9::int[], $10::int[], $11::int[], $12::int[], $13::int[],
                 $14::int[], $15::int[], $16::int[], $17::int[], $18::int[], $19::int[])
          AS u(team_id, wins, losses, minutes, points_for, points_against,
               fgm, fga, three_pm, three_pa, ftm, fta, oreb, dreb, assists, steals, blocks, turnovers)
     ON CONFLICT (team_id, season_id) DO UPDATE SET
       games_played = team_season_stats.games_played + EXCLUDED.games_played,
       wins = team_season_stats.wins + EXCLUDED.wins,
       losses = team_season_stats.losses + EXCLUDED.losses,
       minutes = team_season_stats.minutes + EXCLUDED.minutes,
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
       avg_point_diff = ((team_season_stats.points_for + EXCLUDED.points_for) - (team_season_stats.points_against + EXCLUDED.points_against))::float / (team_season_stats.games_played + EXCLUDED.games_played),
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
       effective_fg_pct = ((team_season_stats.fgm + EXCLUDED.fgm) + 0.5 * (team_season_stats.three_pm + EXCLUDED.three_pm))::float
         / NULLIF(team_season_stats.fga + EXCLUDED.fga, 0),
       true_shooting_pct = (team_season_stats.points_for + EXCLUDED.points_for)::float
         / NULLIF(2.0 * ((team_season_stats.fga + EXCLUDED.fga) + 0.44 * (team_season_stats.fta + EXCLUDED.fta)), 0),
       turnover_pct = (team_season_stats.turnovers + EXCLUDED.turnovers)::float
         / NULLIF((team_season_stats.fga + EXCLUDED.fga) + 0.44 * (team_season_stats.fta + EXCLUDED.fta) + (team_season_stats.turnovers + EXCLUDED.turnovers), 0),
       updated_at = NOW()`,
    [
      seasonId,
      teamIds,
      updates.map(u => u.wins),
      updates.map(u => u.losses),
      updates.map(u => u.minutes),
      updates.map(u => u.pointsFor),
      updates.map(u => u.pointsAgainst),
      updates.map(u => u.fgm),
      updates.map(u => u.fga),
      updates.map(u => u.threePm),
      updates.map(u => u.threePa),
      updates.map(u => u.ftm),
      updates.map(u => u.fta),
      updates.map(u => u.oreb),
      updates.map(u => u.dreb),
      updates.map(u => u.assists),
      updates.map(u => u.steals),
      updates.map(u => u.blocks),
      updates.map(u => u.turnovers)
    ]
  );
}

export async function updateTeamSeasonStats(
  result: GameResult,
  seasonId: string,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  const homeMinutes = result.home_player_stats.reduce((sum, ps) => sum + ps.minutes, 0);
  const awayMinutes = result.away_player_stats.reduce((sum, ps) => sum + ps.minutes, 0);
  const homeWon = result.winner_id === result.home_team_id;

  await updateSingleTeamSeasonStats(db, result.home_team_id, seasonId,
    result.home_stats, result.away_stats.points, homeWon, Math.round(homeMinutes));

  await updateSingleTeamSeasonStats(db, result.away_team_id, seasonId,
    result.away_stats, result.home_stats.points, !homeWon, Math.round(awayMinutes));
}

async function updateSingleTeamSeasonStats(
  db: DbConnection,
  teamId: string,
  seasonId: string,
  stats: TeamStats,
  opponentPoints: number,
  isWin: boolean,
  teamMinutes: number
): Promise<void> {
  await db.query(
    `INSERT INTO team_season_stats
     (team_id, season_id, games_played, wins, losses, minutes, points_for, points_against,
      fgm, fga, three_pm, three_pa, ftm, fta, oreb, dreb, assists, steals, blocks, turnovers)
     VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     ON CONFLICT (team_id, season_id) DO UPDATE SET
       games_played = team_season_stats.games_played + 1,
       wins = team_season_stats.wins + EXCLUDED.wins,
       losses = team_season_stats.losses + EXCLUDED.losses,
       minutes = team_season_stats.minutes + EXCLUDED.minutes,
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
       effective_fg_pct = ((team_season_stats.fgm + EXCLUDED.fgm) + 0.5 * (team_season_stats.three_pm + EXCLUDED.three_pm))::float
         / NULLIF(team_season_stats.fga + EXCLUDED.fga, 0),
       true_shooting_pct = (team_season_stats.points_for + EXCLUDED.points_for)::float
         / NULLIF(2.0 * ((team_season_stats.fga + EXCLUDED.fga) + 0.44 * (team_season_stats.fta + EXCLUDED.fta)), 0),
       turnover_pct = (team_season_stats.turnovers + EXCLUDED.turnovers)::float
         / NULLIF((team_season_stats.fga + EXCLUDED.fga) + 0.44 * (team_season_stats.fta + EXCLUDED.fta) + (team_season_stats.turnovers + EXCLUDED.turnovers), 0),
       updated_at = NOW()`,
    [
      teamId, seasonId,
      isWin ? 1 : 0, isWin ? 0 : 1, teamMinutes,
      stats.points, opponentPoints,
      stats.fgm, stats.fga, stats.three_pm, stats.three_pa,
      stats.ftm, stats.fta, stats.oreb, stats.dreb,
      stats.assists, stats.steals, stats.blocks, stats.turnovers
    ]
  );
}
