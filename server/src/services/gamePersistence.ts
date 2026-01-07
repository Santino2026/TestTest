import { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { getTeamsInfo } from '../db/queries';
import {
  calculateTrueShootingPct,
  calculateEffectiveFgPct,
  calculatePER,
  calculateUsageRate,
  calculateBoxPlusMinus,
  calculateWinShares,
  calculateVORP,
  estimatePossessions
} from '../statistics/advanced';

// ═══════════════════════════════════════════════════════════════════════════
// GAME PERSISTENCE SERVICE
// Centralized game result saving - eliminates duplication in season.ts/games.ts
// Includes advanced stats calculation (FIX for stats not showing)
// ═══════════════════════════════════════════════════════════════════════════

export interface GameResult {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_id: string;
  is_overtime: boolean;
  overtime_periods: number;
  quarters: Array<{ quarter: number; home_points: number; away_points: number }>;
  home_stats: TeamStats;
  away_stats: TeamStats;
  home_player_stats: PlayerGameStats[];
  away_player_stats: PlayerGameStats[];
}

export interface TeamStats {
  points: number;
  fgm: number;
  fga: number;
  fg_pct: number;
  three_pm: number;
  three_pa: number;
  three_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}

export interface PlayerGameStats {
  player_id: string;
  minutes: number;
  points: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plus_minus: number;
}

export interface SimulatedTeam {
  id: string;
  starters: Array<{ id: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE GAME RESULT (Core + Quarters + Player/Team Stats)
// ═══════════════════════════════════════════════════════════════════════════

export async function saveGameResult(
  result: GameResult,
  seasonId: string,
  homeTeam: SimulatedTeam,
  awayTeam: SimulatedTeam,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  // 1. Insert game record
  await db.query(
    `INSERT INTO games (id, season_id, home_team_id, away_team_id, home_score, away_score,
                       winner_id, is_overtime, overtime_periods, status, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [result.id, seasonId, result.home_team_id, result.away_team_id,
     result.home_score, result.away_score, result.winner_id,
     result.is_overtime, result.overtime_periods]
  );

  // 2. Insert quarter scores
  for (const quarter of result.quarters) {
    await db.query(
      `INSERT INTO game_quarters (game_id, quarter, home_points, away_points)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [result.id, quarter.quarter, quarter.home_points, quarter.away_points]
    );
  }

  // 3. Insert team game stats
  await insertTeamGameStats(db, result.id, result.home_team_id, result.home_stats, true);
  await insertTeamGameStats(db, result.id, result.away_team_id, result.away_stats, false);

  // 4. Insert player game stats
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
  db: PoolClient | typeof pool,
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
  db: PoolClient | typeof pool,
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

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE STANDINGS
// ═══════════════════════════════════════════════════════════════════════════

export async function updateStandingsAfterGame(
  result: GameResult,
  seasonId: string,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  // Get team conference/division info
  const teamsInfo = await getTeamsInfo([result.home_team_id, result.away_team_id], client);
  const homeInfo = teamsInfo.get(result.home_team_id);
  const awayInfo = teamsInfo.get(result.away_team_id);

  const homeWon = result.winner_id === result.home_team_id;
  const sameConference = homeInfo?.conference === awayInfo?.conference;
  const sameDivision = homeInfo?.division === awayInfo?.division;

  // Update home team standings
  if (homeWon) {
    await db.query(
      `UPDATE standings SET
         wins = wins + 1,
         home_wins = COALESCE(home_wins, 0) + 1,
         points_for = COALESCE(points_for, 0) + $3,
         points_against = COALESCE(points_against, 0) + $4,
         conference_wins = conference_wins + $5,
         division_wins = division_wins + $6
       WHERE season_id = $1 AND team_id = $2`,
      [seasonId, result.home_team_id, result.home_score, result.away_score,
       sameConference ? 1 : 0, sameDivision ? 1 : 0]
    );
    await db.query(
      `UPDATE standings SET
         losses = losses + 1,
         away_losses = COALESCE(away_losses, 0) + 1,
         points_for = COALESCE(points_for, 0) + $3,
         points_against = COALESCE(points_against, 0) + $4,
         conference_losses = conference_losses + $5,
         division_losses = division_losses + $6
       WHERE season_id = $1 AND team_id = $2`,
      [seasonId, result.away_team_id, result.away_score, result.home_score,
       sameConference ? 1 : 0, sameDivision ? 1 : 0]
    );
  } else {
    await db.query(
      `UPDATE standings SET
         losses = losses + 1,
         home_losses = COALESCE(home_losses, 0) + 1,
         points_for = COALESCE(points_for, 0) + $3,
         points_against = COALESCE(points_against, 0) + $4,
         conference_losses = conference_losses + $5,
         division_losses = division_losses + $6
       WHERE season_id = $1 AND team_id = $2`,
      [seasonId, result.home_team_id, result.home_score, result.away_score,
       sameConference ? 1 : 0, sameDivision ? 1 : 0]
    );
    await db.query(
      `UPDATE standings SET
         wins = wins + 1,
         away_wins = COALESCE(away_wins, 0) + 1,
         points_for = COALESCE(points_for, 0) + $3,
         points_against = COALESCE(points_against, 0) + $4,
         conference_wins = conference_wins + $5,
         division_wins = division_wins + $6
       WHERE season_id = $1 AND team_id = $2`,
      [seasonId, result.away_team_id, result.away_score, result.home_score,
       sameConference ? 1 : 0, sameDivision ? 1 : 0]
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE TEAM SEASON STATS
// FIX: Correct efficiency rating calculation (per 100 possessions)
// ═══════════════════════════════════════════════════════════════════════════

export async function updateTeamSeasonStats(
  result: GameResult,
  seasonId: string,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  const homeWon = result.winner_id === result.home_team_id;

  // Update home team
  await updateSingleTeamSeasonStats(db, result.home_team_id, seasonId,
    result.home_stats, result.away_stats.points, homeWon);

  // Update away team
  await updateSingleTeamSeasonStats(db, result.away_team_id, seasonId,
    result.away_stats, result.home_stats.points, !homeWon);
}

async function updateSingleTeamSeasonStats(
  db: PoolClient | typeof pool,
  teamId: string,
  seasonId: string,
  stats: TeamStats,
  opponentPoints: number,
  won: boolean
): Promise<void> {
  // Calculate possessions for this game (for proper efficiency ratings)
  const possessions = estimatePossessions(stats.fga, stats.fta, stats.oreb, stats.turnovers);

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
       -- FIX: Proper efficiency ratings (per 100 possessions instead of per game)
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

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE PLAYER SEASON STATS WITH ADVANCED METRICS
// FIX: This was the main bug - advanced stats were never calculated
// ═══════════════════════════════════════════════════════════════════════════

export async function updatePlayerSeasonStats(
  result: GameResult,
  seasonId: string,
  homeTeam: SimulatedTeam,
  awayTeam: SimulatedTeam,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  // Get team season totals for advanced stat calculations
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

  // Process home team players
  for (const ps of result.home_player_stats) {
    if (ps.minutes > 0) {
      const isStarter = homeTeam.starters.some(s => s.id === ps.player_id);
      const tt = teamTotals.get(result.home_team_id);
      await updateSinglePlayerSeasonStats(db, ps, result.home_team_id, seasonId, isStarter, tt);
    }
  }

  // Process away team players
  for (const ps of result.away_player_stats) {
    if (ps.minutes > 0) {
      const isStarter = awayTeam.starters.some(s => s.id === ps.player_id);
      const tt = teamTotals.get(result.away_team_id);
      await updateSinglePlayerSeasonStats(db, ps, result.away_team_id, seasonId, isStarter, tt);
    }
  }
}

async function updateSinglePlayerSeasonStats(
  db: PoolClient | typeof pool,
  ps: PlayerGameStats,
  teamId: string,
  seasonId: string,
  isStarter: boolean,
  teamTotals: any
): Promise<void> {
  const rebounds = ps.oreb + ps.dreb;

  // First, upsert the basic stats
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
      isStarter ? 1 : 0,  // games_started
      ps.minutes, ps.points, ps.fgm, ps.fga,
      ps.three_pm, ps.three_pa, ps.ftm, ps.fta,
      ps.oreb, ps.dreb, ps.assists, ps.steals,
      ps.blocks, ps.turnovers, ps.fouls
    ]
  );

  // Now calculate and update per-game and advanced stats
  // Get the updated totals for this player
  const statsResult = await db.query(
    `SELECT * FROM player_season_stats WHERE player_id = $1 AND season_id = $2`,
    [ps.player_id, seasonId]
  );

  if (statsResult.rows.length === 0) return;

  const stats = statsResult.rows[0];
  const gamesPlayed = stats.games_played;

  if (gamesPlayed === 0) return;

  // Calculate per-game averages
  const ppg = stats.points / gamesPlayed;
  const rpg = (stats.oreb + stats.dreb) / gamesPlayed;
  const apg = stats.assists / gamesPlayed;
  const spg = stats.steals / gamesPlayed;
  const bpg = stats.blocks / gamesPlayed;
  const mpg = stats.minutes / gamesPlayed;

  // Calculate shooting percentages
  const fgPct = stats.fga > 0 ? stats.fgm / stats.fga : 0;
  const threePct = stats.three_pa > 0 ? stats.three_pm / stats.three_pa : 0;
  const ftPct = stats.fta > 0 ? stats.ftm / stats.fta : 0;

  // Calculate advanced stats
  const trueShootingPct = calculateTrueShootingPct(stats.points, stats.fga, stats.fta);
  const effectiveFgPct = calculateEffectiveFgPct(stats.fgm, stats.three_pm, stats.fga);

  // Team totals for context (use defaults if not available)
  const tt = teamTotals || {
    minutes: stats.minutes * 5,
    fga: stats.fga * 5,
    fta: stats.fta * 5,
    oreb: stats.oreb * 5,
    dreb: stats.dreb * 5,
    turnovers: stats.turnovers * 5,
    wins: Math.floor(gamesPlayed / 2),
    games: gamesPlayed,
    def_rating: 110,
    fgm: stats.fgm * 5
  };

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

  const teamMinutes = tt.minutes || stats.minutes * 5;
  const teamFga = tt.fga || stats.fga * 5;
  const teamFta = tt.fta || stats.fta * 5;
  const teamTurnovers = tt.turnovers || stats.turnovers * 5;
  const teamWins = tt.wins || 0;
  const teamGames = tt.games || gamesPlayed;
  const teamDefRating = tt.defensive_rating || 110;

  // Calculate PER
  const per = calculatePER(basicStats, {
    minutes: teamMinutes,
    fga: teamFga,
    fta: teamFta,
    oreb: tt.oreb || stats.oreb * 5,
    dreb: tt.dreb || stats.dreb * 5,
    turnovers: teamTurnovers,
    possessions: estimatePossessions(teamFga, teamFta, tt.oreb || 0, teamTurnovers)
  }, 100);

  // Calculate usage rate
  const usageRate = calculateUsageRate(
    stats.fga, stats.fta, stats.turnovers, stats.minutes,
    teamMinutes, teamFga, teamFta, teamTurnovers
  );

  // Calculate BPM
  const bpm = calculateBoxPlusMinus(
    stats.points, stats.oreb + stats.dreb, stats.assists,
    stats.steals, stats.blocks, stats.turnovers,
    stats.fga, stats.fgm, stats.minutes
  );

  // Calculate Win Shares
  const winShares = calculateWinShares(per, stats.minutes, teamWins, teamMinutes);

  // Calculate VORP
  const vorp = calculateVORP(bpm, stats.minutes, teamGames);

  // Calculate possessions for ratings
  const possessions = estimatePossessions(stats.fga, stats.fta, stats.oreb, stats.turnovers);

  // Offensive rating (points per 100 possessions)
  const offensiveRating = possessions > 0
    ? ((stats.points + stats.assists * 0.5) / possessions) * 100
    : 100;

  // Defensive rating (estimated from steals, blocks, def rebounds)
  const defensiveRating = Math.max(85, Math.min(125,
    teamDefRating - ((stats.steals * 2 + stats.blocks * 2 + stats.dreb * 0.5 - stats.fouls * 0.5) / Math.max(1, stats.minutes) * 10)
  ));

  const netRating = offensiveRating - defensiveRating;

  // Update all calculated stats
  await db.query(
    `UPDATE player_season_stats SET
       ppg = $3,
       rpg = $4,
       apg = $5,
       spg = $6,
       bpg = $7,
       mpg = $8,
       fg_pct = $9,
       three_pct = $10,
       ft_pct = $11,
       true_shooting_pct = $12,
       effective_fg_pct = $13,
       per = $14,
       usage_rate = $15,
       offensive_rating = $16,
       defensive_rating = $17,
       net_rating = $18,
       win_shares = $19,
       box_plus_minus = $20,
       value_over_replacement = $21,
       updated_at = NOW()
     WHERE player_id = $1 AND season_id = $2`,
    [
      ps.player_id, seasonId,
      Math.round(ppg * 10) / 10,
      Math.round(rpg * 10) / 10,
      Math.round(apg * 10) / 10,
      Math.round(spg * 10) / 10,
      Math.round(bpg * 10) / 10,
      Math.round(mpg * 10) / 10,
      Math.round(fgPct * 1000) / 1000,
      Math.round(threePct * 1000) / 1000,
      Math.round(ftPct * 1000) / 1000,
      Math.round(trueShootingPct * 1000) / 1000,
      Math.round(effectiveFgPct * 1000) / 1000,
      Math.round(per * 10) / 10,
      Math.round(usageRate * 10) / 10,
      Math.round(offensiveRating * 10) / 10,
      Math.round(defensiveRating * 10) / 10,
      Math.round(netRating * 10) / 10,
      Math.round(winShares * 100) / 100,
      Math.round(bpm * 10) / 10,
      Math.round(vorp * 100) / 100
    ]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE PLAYOFF GAME (Simplified - no advanced stats)
// ═══════════════════════════════════════════════════════════════════════════

export interface PlayoffGameResult {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_id: string;
  is_overtime: boolean;
  overtime_periods: number;
  quarters: Array<{ quarter: number; home_points: number; away_points: number }>;
}

export async function savePlayoffGame(
  result: PlayoffGameResult,
  seasonId: string,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  // Insert game record with is_playoff flag
  await db.query(
    `INSERT INTO games (id, season_id, home_team_id, away_team_id, home_score, away_score,
                       winner_id, is_overtime, overtime_periods, status, is_playoff, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', true, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [result.id, seasonId, result.home_team_id, result.away_team_id,
     result.home_score, result.away_score, result.winner_id,
     result.is_overtime, result.overtime_periods]
  );

  // Insert quarter scores
  for (const quarter of result.quarters) {
    await db.query(
      `INSERT INTO game_quarters (game_id, quarter, home_points, away_points)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [result.id, quarter.quarter, quarter.home_points, quarter.away_points]
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTION: Save complete game with all stats
// ═══════════════════════════════════════════════════════════════════════════

export async function saveCompleteGameResult(
  result: GameResult,
  seasonId: string,
  homeTeam: SimulatedTeam,
  awayTeam: SimulatedTeam,
  updateStandings: boolean = true,
  client?: PoolClient
): Promise<void> {
  // Save core game data
  await saveGameResult(result, seasonId, homeTeam, awayTeam, client);

  // Update standings (skip for preseason)
  if (updateStandings) {
    await updateStandingsAfterGame(result, seasonId, client);
  }

  // Update team season stats
  await updateTeamSeasonStats(result, seasonId, client);

  // Update player season stats with advanced metrics
  await updatePlayerSeasonStats(result, seasonId, homeTeam, awayTeam, client);
}
