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
  per: number;
  true_shooting_pct: number;
  effective_fg_pct: number;
  usage_rate: number;
  assist_pct: number;
  rebound_pct: number;
  offensive_rating: number;
  defensive_rating: number;
  net_rating: number;
  win_shares: number;
  box_plus_minus: number;
  vorp: number;
  game_score: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function estimatePossessions(
  fga: number,
  fta: number,
  oreb: number,
  turnovers: number
): number {
  return fga - oreb + turnovers + 0.44 * fta;
}

export function calculateTrueShootingPct(
  points: number,
  fga: number,
  fta: number
): number {
  const trueShootingAttempts = 2 * (fga + 0.44 * fta);
  if (trueShootingAttempts === 0) return 0;
  return points / trueShootingAttempts;
}

export function calculateEffectiveFgPct(
  fgm: number,
  three_pm: number,
  fga: number
): number {
  if (fga === 0) return 0;
  return (fgm + 0.5 * three_pm) / fga;
}

export function calculatePER(
  stats: BasicStats,
  teamTotals: TeamTotals,
  leaguePace: number = 100
): number {
  if (stats.minutes === 0) return 0;

  const paceFactor = leaguePace / 100;

  const positives =
    stats.three_pm * 3 +
    stats.fgm * 2 +
    stats.ftm +
    stats.assists * 2 +
    stats.steals * 2 +
    stats.blocks * 2 +
    stats.oreb * 1.5 +
    stats.dreb;

  const negatives =
    (stats.fga - stats.fgm) * 0.5 +
    (stats.fta - stats.ftm) * 0.3 +
    stats.turnovers * 2 +
    stats.fouls * 0.5;

  const rawPer = ((positives - negatives) / stats.minutes) * 48;
  const per = rawPer * paceFactor;

  return Math.max(0, round1(per));
}

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

  const playerPossessions = fga + 0.44 * fta + turnovers;
  const teamPossessions = teamFga + 0.44 * teamFta + teamTurnovers;

  const usage = 100 * ((playerPossessions * (teamMinutes / 5)) / (minutes * teamPossessions));

  return round1(usage);
}

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

  const assistPct = 100 * (assists * (teamMinutes / 5)) / (minutes * teammateFgm);

  return Math.min(100, round1(assistPct));
}

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

  const totalRebounds = oreb + dreb;
  const availableRebounds = teamOreb + teamDreb + oppOreb + oppDreb;

  if (availableRebounds === 0) return 0;

  const reboundPct = 100 * (totalRebounds * (teamMinutes / 5)) / (minutes * availableRebounds);

  return Math.min(100, round1(reboundPct));
}

export function calculateOffensiveRating(
  points: number,
  assists: number,
  possessions: number
): number {
  if (possessions === 0) return 0;

  const pointsProduced = points + assists * 0.5;
  const offensiveRating = (pointsProduced / possessions) * 100;

  return round1(offensiveRating);
}

export function calculateDefensiveRating(
  steals: number,
  blocks: number,
  dreb: number,
  fouls: number,
  minutes: number,
  teamDefRating: number
): number {
  if (minutes === 0) return teamDefRating;

  const defensiveContribution = steals * 2 + blocks * 2 + dreb * 0.5 - fouls * 0.5;
  const adjustment = (defensiveContribution / Math.max(1, minutes)) * 10;

  const defensiveRating = Math.max(85, Math.min(125, teamDefRating - adjustment));

  return round1(defensiveRating);
}

export function calculateWinShares(
  per: number,
  minutes: number,
  teamWins: number,
  teamMinutes: number
): number {
  if (minutes === 0 || teamMinutes === 0) return 0;

  const perContribution = (per - 15) / 15;
  const minuteShare = minutes / teamMinutes;
  const winShares = teamWins * minuteShare * (1 + perContribution);

  return Math.max(0, round2(winShares));
}

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

  const per36 = (stat: number) => (stat / minutes) * 36;

  const pointsRate = per36(points);
  const reboundsRate = per36(rebounds);
  const assistsRate = per36(assists);
  const stealsRate = per36(steals);
  const blocksRate = per36(blocks);
  const turnoversRate = per36(turnovers);
  const missedShotsRate = per36(fga - fgm);

  const bpm =
    (pointsRate - 15) * 0.3 +
    (reboundsRate - 7) * 0.5 +
    (assistsRate - 4) * 0.6 +
    stealsRate * 1.5 +
    blocksRate * 1.0 -
    turnoversRate * 1.5 -
    missedShotsRate * 0.3;

  return round1(bpm);
}

export function calculateVORP(
  bpm: number,
  minutes: number,
  teamGames: number
): number {
  const replacementLevel = -2;
  const percentOfMinutes = minutes / (teamGames * 48 * 5);
  const vorp = (bpm - replacementLevel) * percentOfMinutes * teamGames;

  return round2(vorp);
}

export function calculateGameScore(stats: BasicStats): number {
  const gameScore =
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

  return round1(gameScore);
}

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
    ppg: round1(totals.points / gamesPlayed),
    rpg: round1((totals.oreb + totals.dreb) / gamesPlayed),
    apg: round1(totals.assists / gamesPlayed),
    spg: round1(totals.steals / gamesPlayed),
    bpg: round1(totals.blocks / gamesPlayed),
    mpg: round1(totals.minutes / gamesPlayed)
  };
}

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

  const offensiveRating = calculateOffensiveRating(
    playerStats.points,
    playerStats.assists,
    possessions
  );

  const defensiveRating = calculateDefensiveRating(
    playerStats.steals,
    playerStats.blocks,
    playerStats.dreb,
    playerStats.fouls,
    playerStats.minutes,
    teamTotals.def_rating
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
      playerStats.fgm + 100,
      playerStats.fgm
    ),
    rebound_pct: calculateReboundPct(
      playerStats.oreb,
      playerStats.dreb,
      playerStats.minutes,
      teamTotals.minutes,
      teamTotals.oreb,
      teamTotals.dreb,
      teamTotals.oreb,
      teamTotals.dreb
    ),
    offensive_rating: offensiveRating,
    defensive_rating: defensiveRating,
    net_rating: round1(offensiveRating - defensiveRating),
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
