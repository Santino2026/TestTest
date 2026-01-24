import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import {
  calculateTrueShootingPct,
  calculateEffectiveFgPct,
  calculatePER,
  calculateUsageRate,
  calculateAssistPct,
  calculateReboundPct,
  calculateBoxPlusMinus,
  calculateWinShares,
  calculateVORP,
  estimatePossessions
} from '../../statistics/advanced';
import { GameResult, PlayerGameStats, SimulatedTeam, DbConnection } from './types';
import { roundTo, getDefaultTeamTotals } from './utils';

export async function updatePlayerSeasonStats(
  result: GameResult,
  seasonId: string,
  homeTeam: SimulatedTeam,
  awayTeam: SimulatedTeam,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  const teamTotalsResult = await db.query(
    `SELECT team_id, games_played, wins, minutes, fga, fta, oreb, dreb, turnovers, fgm,
            points_for, points_against, defensive_rating
     FROM team_season_stats
     WHERE season_id = $1 AND team_id IN ($2, $3)`,
    [seasonId, result.home_team_id, result.away_team_id]
  );

  const teamTotals = new Map<string, any>();
  for (const row of teamTotalsResult.rows) {
    teamTotals.set(row.team_id, row);
  }

  for (const ps of result.home_player_stats) {
    if (ps.minutes > 0) {
      const isStarter = homeTeam.starters.some(s => s.id === ps.player_id);
      await updateSinglePlayerSeasonStats(db, ps, result.home_team_id, seasonId, isStarter, teamTotals.get(result.home_team_id));
    }
  }

  for (const ps of result.away_player_stats) {
    if (ps.minutes > 0) {
      const isStarter = awayTeam.starters.some(s => s.id === ps.player_id);
      await updateSinglePlayerSeasonStats(db, ps, result.away_team_id, seasonId, isStarter, teamTotals.get(result.away_team_id));
    }
  }
}

async function updateSinglePlayerSeasonStats(
  db: DbConnection,
  ps: PlayerGameStats,
  teamId: string,
  seasonId: string,
  isStarter: boolean,
  teamTotals: any
): Promise<void> {
  await db.query(
    `INSERT INTO player_season_stats
     (player_id, season_id, team_id, games_played, games_started, minutes, points, fgm, fga,
      three_pm, three_pa, ftm, fta, oreb, dreb, assists, steals, blocks, turnovers, fouls)
     VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     ON CONFLICT (player_id, season_id) DO UPDATE SET
       team_id = EXCLUDED.team_id,
       games_played = player_season_stats.games_played + 1,
       games_started = player_season_stats.games_started + EXCLUDED.games_started,
       minutes = player_season_stats.minutes + EXCLUDED.minutes,
       points = player_season_stats.points + EXCLUDED.points,
       fgm = player_season_stats.fgm + EXCLUDED.fgm,
       fga = player_season_stats.fga + EXCLUDED.fga,
       three_pm = player_season_stats.three_pm + EXCLUDED.three_pm,
       three_pa = player_season_stats.three_pa + EXCLUDED.three_pa,
       ftm = player_season_stats.ftm + EXCLUDED.ftm,
       fta = player_season_stats.fta + EXCLUDED.fta,
       oreb = player_season_stats.oreb + EXCLUDED.oreb,
       dreb = player_season_stats.dreb + EXCLUDED.dreb,
       assists = player_season_stats.assists + EXCLUDED.assists,
       steals = player_season_stats.steals + EXCLUDED.steals,
       blocks = player_season_stats.blocks + EXCLUDED.blocks,
       turnovers = player_season_stats.turnovers + EXCLUDED.turnovers,
       fouls = player_season_stats.fouls + EXCLUDED.fouls,
       updated_at = NOW()`,
    [
      ps.player_id, seasonId, teamId,
      isStarter ? 1 : 0,
      Math.round(ps.minutes), ps.points, ps.fgm, ps.fga,
      ps.three_pm, ps.three_pa, ps.ftm, ps.fta,
      ps.oreb, ps.dreb, ps.assists, ps.steals,
      ps.blocks, ps.turnovers, ps.fouls
    ]
  );

  const statsResult = await db.query(
    `SELECT * FROM player_season_stats WHERE player_id = $1 AND season_id = $2`,
    [ps.player_id, seasonId]
  );

  if (statsResult.rows.length === 0) return;

  const stats = statsResult.rows[0];
  const gamesPlayed = stats.games_played;

  if (gamesPlayed === 0) return;

  const ppg = stats.points / gamesPlayed;
  const rpg = (stats.oreb + stats.dreb) / gamesPlayed;
  const apg = stats.assists / gamesPlayed;
  const spg = stats.steals / gamesPlayed;
  const bpg = stats.blocks / gamesPlayed;
  const mpg = stats.minutes / gamesPlayed;

  const fgPct = stats.fga > 0 ? stats.fgm / stats.fga : 0;
  const threePct = stats.three_pa > 0 ? stats.three_pm / stats.three_pa : 0;
  const ftPct = stats.fta > 0 ? stats.ftm / stats.fta : 0;

  const trueShootingPct = calculateTrueShootingPct(stats.points, stats.fga, stats.fta);
  const effectiveFgPct = calculateEffectiveFgPct(stats.fgm, stats.three_pm, stats.fga);

  const tt = teamTotals || getDefaultTeamTotals(stats, gamesPlayed);

  const teamMinutes = tt.minutes || stats.minutes * 5;
  const teamFga = tt.fga || stats.fga * 5;
  const teamFta = tt.fta || stats.fta * 5;
  const teamTurnovers = tt.turnovers || stats.turnovers * 5;
  const teamWins = tt.wins || 0;
  const teamGames = tt.games || gamesPlayed;
  const teamDefRating = tt.defensive_rating || 110;

  const basicStats = {
    minutes: stats.minutes,
    points: stats.points,
    fgm: stats.fgm,
    fga: stats.fga,
    three_pm: stats.three_pm,
    three_pa: stats.three_pa,
    ftm: stats.ftm,
    fta: stats.fta,
    oreb: stats.oreb,
    dreb: stats.dreb,
    assists: stats.assists,
    steals: stats.steals,
    blocks: stats.blocks,
    turnovers: stats.turnovers,
    fouls: stats.fouls
  };

  const teamFgm = tt.fgm || stats.fgm * 5;

  const per = calculatePER(basicStats, {
    minutes: teamMinutes,
    fgm: teamFgm,
    fga: teamFga,
    fta: teamFta,
    oreb: tt.oreb || stats.oreb * 5,
    dreb: tt.dreb || stats.dreb * 5,
    turnovers: teamTurnovers,
    possessions: estimatePossessions(teamFga, teamFta, tt.oreb || 0, teamTurnovers)
  }, 100);

  const usageRate = calculateUsageRate(
    stats.fga, stats.fta, stats.turnovers, stats.minutes,
    teamMinutes, teamFga, teamFta, teamTurnovers
  );

  const bpm = calculateBoxPlusMinus(
    stats.points, stats.oreb + stats.dreb, stats.assists,
    stats.steals, stats.blocks, stats.turnovers,
    stats.fga, stats.fgm, stats.minutes
  );

  const assistPct = calculateAssistPct(
    stats.assists, stats.minutes, teamMinutes, teamFgm, stats.fgm
  );
  const reboundPct = calculateReboundPct(
    stats.oreb, stats.dreb, stats.minutes, teamMinutes,
    tt.oreb || stats.oreb * 5, tt.dreb || stats.dreb * 5,
    tt.oreb || stats.oreb * 5, tt.dreb || stats.dreb * 5
  );

  const winShares = calculateWinShares(per, stats.minutes, teamWins, teamMinutes);
  const vorp = calculateVORP(bpm, stats.minutes, teamGames);

  const possessions = estimatePossessions(stats.fga, stats.fta, stats.oreb, stats.turnovers);

  const offensiveRating = possessions > 0
    ? ((stats.points + stats.assists * 0.5) / possessions) * 100
    : 100;

  const defensiveRating = Math.max(85, Math.min(125,
    teamDefRating - ((stats.steals * 2 + stats.blocks * 2 + stats.dreb * 0.5 - stats.fouls * 0.5) / Math.max(1, stats.minutes) * 10)
  ));

  const netRating = offensiveRating - defensiveRating;

  await db.query(
    `UPDATE player_season_stats SET
       ppg = $3, rpg = $4, apg = $5, spg = $6, bpg = $7, mpg = $8,
       fg_pct = $9, three_pct = $10, ft_pct = $11,
       true_shooting_pct = $12, effective_fg_pct = $13,
       per = $14, usage_rate = $15, assist_pct = $16, rebound_pct = $17,
       offensive_rating = $18, defensive_rating = $19, net_rating = $20,
       win_shares = $21, box_plus_minus = $22, value_over_replacement = $23,
       updated_at = NOW()
     WHERE player_id = $1 AND season_id = $2`,
    [
      ps.player_id, seasonId,
      roundTo(ppg, 1), roundTo(rpg, 1), roundTo(apg, 1),
      roundTo(spg, 1), roundTo(bpg, 1), roundTo(mpg, 1),
      roundTo(fgPct, 3), roundTo(threePct, 3), roundTo(ftPct, 3),
      roundTo(trueShootingPct, 3), roundTo(effectiveFgPct, 3),
      roundTo(per, 1), roundTo(usageRate, 1), roundTo(assistPct, 1), roundTo(reboundPct, 1),
      roundTo(offensiveRating, 1), roundTo(defensiveRating, 1), roundTo(netRating, 1),
      roundTo(winShares, 2), roundTo(bpm, 1), roundTo(vorp, 2)
    ]
  );
}
