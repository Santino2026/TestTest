// Advanced Statistics Calculations
// NBA-style advanced metrics

export interface BasicStats {
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
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}

export interface TeamTotals {
  minutes: number;
  fga: number;
  fta: number;
  oreb: number;
  dreb: number;
  turnovers: number;
  possessions: number;
}

export interface AdvancedStats {
  // Efficiency Metrics
  per: number;                    // Player Efficiency Rating
  true_shooting_pct: number;      // True Shooting %
  effective_fg_pct: number;       // Effective FG %

  // Usage & Production
  usage_rate: number;             // Usage Rate
  assist_pct: number;             // Assist %
  rebound_pct: number;            // Total Rebound %

  // Ratings
  offensive_rating: number;       // Points per 100 possessions
  defensive_rating: number;       // Points allowed per 100 possessions
  net_rating: number;             // Off - Def

  // Impact Metrics
  win_shares: number;             // Win Shares
  box_plus_minus: number;         // Box Plus/Minus (BPM)
  vorp: number;                   // Value Over Replacement

  // Single Game
  game_score: number;             // Game Score (Hollinger)
}

// ═══════════════════════════════════════════════════════════════════════════
// BASIC CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Calculate possessions (team-level estimate)
export function estimatePossessions(
  fga: number,
  fta: number,
  oreb: number,
  turnovers: number
): number {
  // Simplified possession formula: FGA - OREB + TO + 0.44*FTA
  return fga - oreb + turnovers + 0.44 * fta;
}

// True Shooting Percentage
// Accounts for 3-pointers and free throws
export function calculateTrueShootingPct(
  points: number,
  fga: number,
  fta: number
): number {
  const tsa = 2 * (fga + 0.44 * fta);  // True Shooting Attempts
  if (tsa === 0) return 0;
  return points / tsa;
}

// Effective Field Goal Percentage
// Adjusts for 3-pointers being worth more
export function calculateEffectiveFgPct(
  fgm: number,
  three_pm: number,
  fga: number
): number {
  if (fga === 0) return 0;
  return (fgm + 0.5 * three_pm) / fga;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYER EFFICIENCY RATING (PER)
// ═══════════════════════════════════════════════════════════════════════════

// Simplified PER calculation (Hollinger)
export function calculatePER(
  stats: BasicStats,
  teamTotals: TeamTotals,
  leaguePace: number = 100
): number {
  if (stats.minutes === 0) return 0;

  // Factor for pace adjustment
  const paceFactor = leaguePace / 100;

  // Positive contributions
  const positives =
    stats.three_pm * 3 +
    stats.fgm * 2 +
    stats.ftm +
    stats.assists * 2 +
    stats.steals * 2 +
    stats.blocks * 2 +
    stats.oreb * 1.5 +
    stats.dreb;

  // Negative contributions
  const negatives =
    (stats.fga - stats.fgm) * 0.5 +
    (stats.fta - stats.ftm) * 0.3 +
    stats.turnovers * 2 +
    stats.fouls * 0.5;

  // Raw PER
  const rawPer = (positives - negatives) / stats.minutes * 48;

  // Adjust for pace and normalize to 15 league average
  const per = rawPer * paceFactor;

  return Math.max(0, Math.round(per * 10) / 10);
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE RATE
// ═══════════════════════════════════════════════════════════════════════════

// Percentage of team possessions used by player while on court
export function calculateUsageRate(
  fga: number,
  fta: number,
  turnovers: number,
  minutes: number,
  teamMinutes: number,
  teamFga: number,
  teamFta: number,
  teamTurnovers: number
): number {
  if (minutes === 0 || teamMinutes === 0) return 0;

  const playerPoss = fga + 0.44 * fta + turnovers;
  const teamPoss = teamFga + 0.44 * teamFta + teamTurnovers;

  const usg = 100 * ((playerPoss * (teamMinutes / 5)) / (minutes * teamPoss));

  return Math.round(usg * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSIST PERCENTAGE
// ═══════════════════════════════════════════════════════════════════════════

// Percentage of teammate field goals assisted while on court
export function calculateAssistPct(
  assists: number,
  minutes: number,
  teamMinutes: number,
  teamFgm: number,
  playerFgm: number
): number {
  if (minutes === 0) return 0;

  const teammateFgm = teamFgm - playerFgm;
  if (teammateFgm === 0) return 0;

  const astPct = 100 * (assists * (teamMinutes / 5)) / (minutes * teammateFgm);

  return Math.min(100, Math.round(astPct * 10) / 10);
}

// ═══════════════════════════════════════════════════════════════════════════
// REBOUND PERCENTAGE
// ═══════════════════════════════════════════════════════════════════════════

// Percentage of available rebounds grabbed while on court
export function calculateReboundPct(
  oreb: number,
  dreb: number,
  minutes: number,
  teamMinutes: number,
  teamOreb: number,
  teamDreb: number,
  oppOreb: number,
  oppDreb: number
): number {
  if (minutes === 0) return 0;

  const totalReb = oreb + dreb;
  const availableReb = teamOreb + teamDreb + oppOreb + oppDreb;

  if (availableReb === 0) return 0;

  const rebPct = 100 * (totalReb * (teamMinutes / 5)) / (minutes * availableReb);

  return Math.min(100, Math.round(rebPct * 10) / 10);
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFENSIVE & DEFENSIVE RATING
// ═══════════════════════════════════════════════════════════════════════════

// Points produced per 100 possessions
export function calculateOffensiveRating(
  points: number,
  assists: number,
  possessions: number
): number {
  if (possessions === 0) return 0;

  // Simplified: (points + assist_points) / possessions * 100
  // Assume each assist is worth ~2.5 points contribution
  const pointsProduced = points + assists * 0.5;
  const offRtg = (pointsProduced / possessions) * 100;

  return Math.round(offRtg * 10) / 10;
}

// Points allowed per 100 possessions (team metric, estimated for players)
export function calculateDefensiveRating(
  steals: number,
  blocks: number,
  dreb: number,
  fouls: number,
  minutes: number,
  teamDefRating: number
): number {
  if (minutes === 0) return teamDefRating;

  // Estimate player's defensive impact relative to team
  const defensiveContrib = (steals * 2 + blocks * 2 + dreb * 0.5 - fouls * 0.5);
  const adjustment = defensiveContrib / Math.max(1, minutes) * 10;

  // Better defensive stats = lower (better) defensive rating
  const defRtg = Math.max(85, Math.min(125, teamDefRating - adjustment));

  return Math.round(defRtg * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN SHARES
// ═══════════════════════════════════════════════════════════════════════════

// Estimate of wins contributed (simplified)
export function calculateWinShares(
  per: number,
  minutes: number,
  teamWins: number,
  teamMinutes: number
): number {
  if (minutes === 0 || teamMinutes === 0) return 0;

  // Estimate contribution based on PER relative to league average (15)
  const perContrib = (per - 15) / 15;

  // Share of team minutes
  const minuteShare = minutes / teamMinutes;

  // Win shares = team wins * player's contribution share
  const ws = teamWins * minuteShare * (1 + perContrib);

  return Math.max(0, Math.round(ws * 100) / 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOX PLUS/MINUS
// ═══════════════════════════════════════════════════════════════════════════

// Estimate of points contributed per 100 possessions above league average
export function calculateBoxPlusMinus(
  points: number,
  rebounds: number,
  assists: number,
  steals: number,
  blocks: number,
  turnovers: number,
  fga: number,
  fgm: number,
  minutes: number
): number {
  if (minutes === 0) return 0;

  // Per-minute rates
  const rate = (stat: number) => stat / minutes * 36;

  const ptsRate = rate(points);
  const rebRate = rate(rebounds);
  const astRate = rate(assists);
  const stlRate = rate(steals);
  const blkRate = rate(blocks);
  const tovRate = rate(turnovers);
  const missRate = rate(fga - fgm);

  // Simplified BPM formula
  const bpm =
    (ptsRate - 15) * 0.3 +
    (rebRate - 7) * 0.5 +
    (astRate - 4) * 0.6 +
    stlRate * 1.5 +
    blkRate * 1.0 -
    tovRate * 1.5 -
    missRate * 0.3;

  return Math.round(bpm * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════════════════
// VORP (Value Over Replacement Player)
// ═══════════════════════════════════════════════════════════════════════════

export function calculateVORP(
  bpm: number,
  minutes: number,
  teamGames: number
): number {
  // VORP = (BPM - (-2)) * (% of team minutes) * team games / 82
  const replacementLevel = -2;
  const percentOfMinutes = minutes / (teamGames * 48 * 5);
  const vorp = (bpm - replacementLevel) * percentOfMinutes * teamGames;

  return Math.round(vorp * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME SCORE (Hollinger)
// ═══════════════════════════════════════════════════════════════════════════

// Single-game summary stat
export function calculateGameScore(stats: BasicStats): number {
  const gs =
    stats.points +
    stats.fgm * 0.4 -
    stats.fga * 0.7 -
    (stats.fta - stats.ftm) * 0.4 +
    stats.oreb * 0.7 +
    stats.dreb * 0.3 +
    stats.steals +
    stats.assists * 0.7 +
    stats.blocks * 0.7 -
    stats.fouls * 0.4 -
    stats.turnovers;

  return Math.round(gs * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════════════════
// PER-GAME AVERAGES
// ═══════════════════════════════════════════════════════════════════════════

export function calculatePerGameAverages(
  totals: BasicStats,
  gamesPlayed: number
): {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mpg: number;
} {
  if (gamesPlayed === 0) {
    return { ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0, mpg: 0 };
  }

  return {
    ppg: Math.round((totals.points / gamesPlayed) * 10) / 10,
    rpg: Math.round(((totals.oreb + totals.dreb) / gamesPlayed) * 10) / 10,
    apg: Math.round((totals.assists / gamesPlayed) * 10) / 10,
    spg: Math.round((totals.steals / gamesPlayed) * 10) / 10,
    bpg: Math.round((totals.blocks / gamesPlayed) * 10) / 10,
    mpg: Math.round((totals.minutes / gamesPlayed) * 10) / 10
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CALCULATE ALL ADVANCED STATS
// ═══════════════════════════════════════════════════════════════════════════

export function calculateAllAdvancedStats(
  playerStats: BasicStats & { games_played: number },
  teamTotals: TeamTotals & { wins: number; games: number; def_rating: number },
  leaguePace: number = 100
): AdvancedStats {
  const possessions = estimatePossessions(
    playerStats.fga,
    playerStats.fta,
    playerStats.oreb,
    playerStats.turnovers
  );

  const per = calculatePER(playerStats, teamTotals, leaguePace);

  const bpm = calculateBoxPlusMinus(
    playerStats.points,
    playerStats.oreb + playerStats.dreb,
    playerStats.assists,
    playerStats.steals,
    playerStats.blocks,
    playerStats.turnovers,
    playerStats.fga,
    playerStats.fgm,
    playerStats.minutes
  );

  return {
    per,
    true_shooting_pct: calculateTrueShootingPct(
      playerStats.points,
      playerStats.fga,
      playerStats.fta
    ),
    effective_fg_pct: calculateEffectiveFgPct(
      playerStats.fgm,
      playerStats.three_pm,
      playerStats.fga
    ),
    usage_rate: calculateUsageRate(
      playerStats.fga,
      playerStats.fta,
      playerStats.turnovers,
      playerStats.minutes,
      teamTotals.minutes,
      teamTotals.fga,
      teamTotals.fta,
      teamTotals.turnovers
    ),
    assist_pct: calculateAssistPct(
      playerStats.assists,
      playerStats.minutes,
      teamTotals.minutes,
      playerStats.fgm + 100, // Estimate team FGM
      playerStats.fgm
    ),
    rebound_pct: calculateReboundPct(
      playerStats.oreb,
      playerStats.dreb,
      playerStats.minutes,
      teamTotals.minutes,
      teamTotals.oreb,
      teamTotals.dreb,
      teamTotals.oreb, // Estimate opponent rebounds
      teamTotals.dreb
    ),
    offensive_rating: calculateOffensiveRating(
      playerStats.points,
      playerStats.assists,
      possessions
    ),
    defensive_rating: calculateDefensiveRating(
      playerStats.steals,
      playerStats.blocks,
      playerStats.dreb,
      playerStats.fouls,
      playerStats.minutes,
      teamTotals.def_rating
    ),
    net_rating: 0, // Calculated from off - def
    win_shares: calculateWinShares(
      per,
      playerStats.minutes,
      teamTotals.wins,
      teamTotals.minutes
    ),
    box_plus_minus: bpm,
    vorp: calculateVORP(bpm, playerStats.minutes, teamTotals.games),
    game_score: calculateGameScore(playerStats)
  };
}
