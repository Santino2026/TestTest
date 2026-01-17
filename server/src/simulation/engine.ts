import { v4 as uuidv4 } from 'uuid';
import {
  SimPlayer,
  SimTeam,
  GameResult,
  QuarterResult,
  Play,
  PlayerGameStats,
  TeamGameStats,
  PossessionContext,
  QUARTER_LENGTH,
  OVERTIME_LENGTH,
  SHOT_CLOCK
} from './types';
import { simulatePossession } from './possession';
import { initializeHotColdState } from './hotcold';

function initPlayerStats(): PlayerGameStats {
  return {
    points: 0,
    fgm: 0,
    fga: 0,
    three_pm: 0,
    three_pa: 0,
    ftm: 0,
    fta: 0,
    oreb: 0,
    dreb: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
    plus_minus: 0,
    minutes: 0
  };
}

function initTeamStats(): TeamGameStats {
  return {
    points: 0,
    fgm: 0,
    fga: 0,
    fg_pct: 0,
    three_pm: 0,
    three_pa: 0,
    three_pct: 0,
    ftm: 0,
    fta: 0,
    ft_pct: 0,
    oreb: 0,
    dreb: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
    fast_break_points: 0,
    points_in_paint: 0,
    second_chance_points: 0
  };
}

function updatePlayerStats(player: SimPlayer, play: Play): void {
  const stats = player.stats;

  switch (play.type) {
    case 'made_shot':
      if (play.primary_player_id === player.id) {
        stats.points += play.points;
        stats.fgm += 1;
        stats.fga += 1;
        if (play.shot_type?.includes('three')) {
          stats.three_pm += 1;
          stats.three_pa += 1;
        }
      }
      if (play.secondary_player_id === player.id) {
        stats.assists += 1;
      }
      break;

    case 'missed_shot':
      if (play.primary_player_id === player.id) {
        stats.fga += 1;
        if (play.shot_type?.includes('three')) {
          stats.three_pa += 1;
        }
      }
      break;

    case 'offensive_rebound':
      if (play.primary_player_id === player.id) {
        stats.oreb += 1;
        stats.rebounds += 1;
      }
      break;

    case 'defensive_rebound':
      if (play.primary_player_id === player.id) {
        stats.dreb += 1;
        stats.rebounds += 1;
      }
      break;

    case 'steal':
      if (play.secondary_player_id === player.id) {
        stats.steals += 1;
      }
      if (play.primary_player_id === player.id) {
        stats.turnovers += 1;
      }
      break;

    case 'block':
      if (play.secondary_player_id === player.id) {
        stats.blocks += 1;
      }
      break;

    case 'turnover':
      if (play.primary_player_id === player.id) {
        stats.turnovers += 1;
      }
      break;

    case 'foul':
      if (play.primary_player_id === player.id) {
        stats.fouls += 1;
        player.fouls += 1;
      }
      break;

    case 'free_throw_made':
      if (play.primary_player_id === player.id) {
        stats.points += 1;
        stats.ftm += 1;
        stats.fta += 1;
      }
      break;

    case 'free_throw_missed':
      if (play.primary_player_id === player.id) {
        stats.fta += 1;
      }
      break;
  }
}

function calculateTeamStats(players: SimPlayer[]): TeamGameStats {
  const stats = initTeamStats();

  for (const player of players) {
    const ps = player.stats;
    stats.points += ps.points;
    stats.fgm += ps.fgm;
    stats.fga += ps.fga;
    stats.three_pm += ps.three_pm;
    stats.three_pa += ps.three_pa;
    stats.ftm += ps.ftm;
    stats.fta += ps.fta;
    stats.oreb += ps.oreb;
    stats.dreb += ps.dreb;
    stats.rebounds += ps.rebounds;
    stats.assists += ps.assists;
    stats.steals += ps.steals;
    stats.blocks += ps.blocks;
    stats.turnovers += ps.turnovers;
    stats.fouls += ps.fouls;
  }

  stats.fg_pct = stats.fga > 0 ? stats.fgm / stats.fga : 0;
  stats.three_pct = stats.three_pa > 0 ? stats.three_pm / stats.three_pa : 0;
  stats.ft_pct = stats.fta > 0 ? stats.ftm / stats.fta : 0;

  // Sanity check: a team should never finish with 0 FGA
  if (stats.fga === 0) {
    console.error('SIMULATION BUG: Team finished with 0 field goal attempts');
  }

  return stats;
}

function updateFatigue(playersOnCourt: SimPlayer[], timeElapsed: number): void {
  const minutesPlayed = timeElapsed / 60;

  for (const player of playersOnCourt) {
    const staminaMod = 2 - (player.attributes.stamina / 100);
    const fatigueGain = 2.5 * minutesPlayed * staminaMod;
    const hasMotor = player.traits.some(t => t.name === 'Motor');
    const finalFatigue = hasMotor ? fatigueGain * 0.6 : fatigueGain;

    player.fatigue = Math.min(100, player.fatigue + finalFatigue);
    player.minutes_played += minutesPlayed;
    player.stats.minutes += minutesPlayed;
  }
}

function recoverFatigue(benchPlayers: SimPlayer[], timeElapsed: number): void {
  const minutesRested = timeElapsed / 60;

  for (const player of benchPlayers) {
    player.fatigue = Math.max(0, player.fatigue - 8 * minutesRested);
  }
}

const POSITION_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

function manageSubstitutions(team: SimTeam): void {
  const onCourt = team.on_court;
  const bench = team.roster.filter(p => !p.is_on_court);

  for (let i = 0; i < onCourt.length; i++) {
    const player = onCourt[i];
    const needsRest = player.fatigue > 70 || player.fouls >= 4;
    const mustSub = player.fatigue > 90 || player.fouls >= 6;

    if (!needsRest && !mustSub) continue;

    const playerPosIdx = POSITION_ORDER.indexOf(player.position);
    let bestSub: SimPlayer | null = null;
    let bestScore = -1;

    for (const sub of bench) {
      if (sub.fouls >= 6 || sub.fatigue > 60) continue;

      const subPosIdx = POSITION_ORDER.indexOf(sub.position);
      const positionMatch = Math.abs(subPosIdx - playerPosIdx) <= 1 ? 1 : 0;
      const score = sub.overall * 0.4 + (100 - sub.fatigue) * 0.3 + positionMatch * 20 + (6 - sub.fouls) * 5;

      if (score > bestScore) {
        bestScore = score;
        bestSub = sub;
      }
    }

    if (bestSub && (mustSub || bestScore > player.overall * 0.8)) {
      player.is_on_court = false;
      bestSub.is_on_court = true;
      onCourt[i] = bestSub;
    }
  }
}

function simulateTipOff(homeTeam: SimTeam, awayTeam: SimTeam): 'home' | 'away' {
  const homeCenter = homeTeam.on_court.find(p => p.position === 'C') || homeTeam.on_court[0];
  const awayCenter = awayTeam.on_court.find(p => p.position === 'C') || awayTeam.on_court[0];

  if (!homeCenter || !awayCenter) {
    return Math.random() > 0.5 ? 'home' : 'away';
  }

  const homeScore = homeCenter.height_inches + (homeCenter.attributes?.vertical || 50) * 0.5;
  const awayScore = awayCenter.height_inches + (awayCenter.attributes?.vertical || 50) * 0.5;
  const roll = Math.random() * 20 - 10;

  return homeScore + roll > awayScore ? 'home' : 'away';
}

function simulateQuarter(
  homeTeam: SimTeam,
  awayTeam: SimTeam,
  quarter: number,
  homeScore: number,
  awayScore: number,
  possession: 'home' | 'away',
  quarterLength: number = QUARTER_LENGTH
): { result: QuarterResult; finalHomeScore: number; finalAwayScore: number; possession: 'home' | 'away' } {
  const plays: Play[] = [];
  let gameClock = quarterLength;
  let currentHomeScore = homeScore;
  let currentAwayScore = awayScore;
  let currentPossession = possession;
  let quarterHomePoints = 0;
  let quarterAwayPoints = 0;

  plays.push({
    id: uuidv4(),
    type: 'quarter_start',
    quarter,
    game_clock: gameClock,
    shot_clock: SHOT_CLOCK,
    primary_player_id: '',
    team_id: '',
    points: 0,
    home_score: currentHomeScore,
    away_score: currentAwayScore,
    description: `Quarter ${quarter} begins`
  });

  while (gameClock > 0) {
    homeTeam.on_court = homeTeam.roster.filter(p => p.is_on_court);
    awayTeam.on_court = awayTeam.roster.filter(p => p.is_on_court);

    if (homeTeam.on_court.length === 0 || awayTeam.on_court.length === 0) {
      console.error('No players on court! Home:', homeTeam.on_court.length, 'Away:', awayTeam.on_court.length);
      // Use starters if available, otherwise fall back to roster
      const homePlayers = homeTeam.starters.length >= 5 ? homeTeam.starters : homeTeam.roster;
      const awayPlayers = awayTeam.starters.length >= 5 ? awayTeam.starters : awayTeam.roster;
      for (const p of homePlayers.slice(0, 5)) p.is_on_court = true;
      for (const p of awayPlayers.slice(0, 5)) p.is_on_court = true;
      homeTeam.on_court = homeTeam.roster.filter(p => p.is_on_court);
      awayTeam.on_court = awayTeam.roster.filter(p => p.is_on_court);
    }

    const isHome = currentPossession === 'home';
    const offensiveTeam = isHome ? homeTeam : awayTeam;
    const defensiveTeam = isHome ? awayTeam : homeTeam;

    const context: PossessionContext = {
      team: offensiveTeam,
      opponent: defensiveTeam,
      players_on_court: offensiveTeam.on_court,
      defenders: defensiveTeam.on_court,
      shot_clock: Math.min(SHOT_CLOCK, gameClock),
      game_clock: gameClock,
      quarter,
      score_differential: isHome ? currentHomeScore - currentAwayScore : currentAwayScore - currentHomeScore,
      is_fast_break: Math.random() < 0.15
    };

    const result = simulatePossession(context);

    for (const play of result.plays) {
      play.home_score = currentHomeScore + (isHome ? play.points : 0);
      play.away_score = currentAwayScore + (isHome ? 0 : play.points);
      plays.push(play);
    }

    if (result.points_scored > 0) {
      if (isHome) {
        currentHomeScore += result.points_scored;
        quarterHomePoints += result.points_scored;
      } else {
        currentAwayScore += result.points_scored;
        quarterAwayPoints += result.points_scored;
      }

      for (const player of offensiveTeam.on_court) {
        player.stats.plus_minus += result.points_scored;
      }
      for (const player of defensiveTeam.on_court) {
        player.stats.plus_minus -= result.points_scored;
      }
    }

    for (const play of result.plays) {
      for (const player of [...homeTeam.roster, ...awayTeam.roster]) {
        updatePlayerStats(player, play);
      }
    }

    updateFatigue(offensiveTeam.on_court, result.time_elapsed);
    updateFatigue(defensiveTeam.on_court, result.time_elapsed);
    recoverFatigue(offensiveTeam.roster.filter(p => !p.is_on_court), result.time_elapsed);
    recoverFatigue(defensiveTeam.roster.filter(p => !p.is_on_court), result.time_elapsed);

    gameClock -= result.time_elapsed;

    if (!result.is_offensive_rebound) {
      currentPossession = currentPossession === 'home' ? 'away' : 'home';
    }

    if (gameClock % 180 < result.time_elapsed || gameClock <= 60) {
      manageSubstitutions(homeTeam);
      manageSubstitutions(awayTeam);
    }
  }

  plays.push({
    id: uuidv4(),
    type: 'quarter_end',
    quarter,
    game_clock: 0,
    shot_clock: 0,
    primary_player_id: '',
    team_id: '',
    points: 0,
    home_score: currentHomeScore,
    away_score: currentAwayScore,
    description: `End of Quarter ${quarter}`
  });

  return {
    result: {
      quarter,
      plays,
      home_points: quarterHomePoints,
      away_points: quarterAwayPoints
    },
    finalHomeScore: currentHomeScore,
    finalAwayScore: currentAwayScore,
    possession: currentPossession
  };
}

export function simulateGame(homeTeam: SimTeam, awayTeam: SimTeam): GameResult {
  const gameId = uuidv4();

  for (const player of [...homeTeam.roster, ...awayTeam.roster]) {
    player.stats = initPlayerStats();
    player.fatigue = 0;
    player.minutes_played = 0;
    player.fouls = 0;
    player.is_on_court = false;
    player.hot_cold_state = initializeHotColdState();
  }

  const homeStarters = homeTeam.starters?.length >= 5 ? homeTeam.starters : homeTeam.roster.slice(0, 5);
  const awayStarters = awayTeam.starters?.length >= 5 ? awayTeam.starters : awayTeam.roster.slice(0, 5);

  for (let i = 0; i < 5 && i < homeStarters.length; i++) homeStarters[i].is_on_court = true;
  for (let i = 0; i < 5 && i < awayStarters.length; i++) awayStarters[i].is_on_court = true;

  homeTeam.on_court = homeTeam.roster.filter(p => p.is_on_court);
  awayTeam.on_court = awayTeam.roster.filter(p => p.is_on_court);

  if (homeTeam.on_court.length === 0) {
    homeTeam.on_court = homeTeam.roster.slice(0, 5);
    homeTeam.on_court.forEach(p => p.is_on_court = true);
  }
  if (awayTeam.on_court.length === 0) {
    awayTeam.on_court = awayTeam.roster.slice(0, 5);
    awayTeam.on_court.forEach(p => p.is_on_court = true);
  }

  const quarters: QuarterResult[] = [];
  const allPlays: Play[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let possession = simulateTipOff(homeTeam, awayTeam);
  let overtimePeriods = 0;

  for (let q = 1; q <= 4; q++) {
    const quarterResult = simulateQuarter(homeTeam, awayTeam, q, homeScore, awayScore, possession);
    quarters.push(quarterResult.result);
    allPlays.push(...quarterResult.result.plays);
    homeScore = quarterResult.finalHomeScore;
    awayScore = quarterResult.finalAwayScore;
    possession = q % 2 === 0 ? simulateTipOff(homeTeam, awayTeam) : possession;

    for (const player of [...homeTeam.roster, ...awayTeam.roster]) {
      player.fatigue = Math.max(0, player.fatigue - 5);
    }
  }

  // Keep playing OT until someone wins (no limit - real NBA has no OT cap)
  while (homeScore === awayScore) {
    overtimePeriods++;
    const otResult = simulateQuarter(homeTeam, awayTeam, 4 + overtimePeriods, homeScore, awayScore, possession, OVERTIME_LENGTH);
    quarters.push(otResult.result);
    allPlays.push(...otResult.result.plays);
    homeScore = otResult.finalHomeScore;
    awayScore = otResult.finalAwayScore;
    possession = otResult.possession;

    // Safety: prevent infinite loop in case of simulation bug (should never happen)
    if (overtimePeriods >= 10) {
      console.error('WARNING: 10 OT periods reached, forcing tiebreaker');
      homeScore += 1; // Force home team win as tiebreaker
      break;
    }
  }

  const homeStats = calculateTeamStats(homeTeam.roster);
  const awayStats = calculateTeamStats(awayTeam.roster);

  const mapPlayerStats = (roster: SimPlayer[]) => roster.map(p => ({
    ...p.stats,
    player_id: p.id,
    player_name: `${p.first_name} ${p.last_name}`
  }));

  return {
    id: gameId,
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    home_score: homeScore,
    away_score: awayScore,
    quarters,
    plays: allPlays,
    home_stats: homeStats,
    away_stats: awayStats,
    home_player_stats: mapPlayerStats(homeTeam.roster),
    away_player_stats: mapPlayerStats(awayTeam.roster),
    winner_id: homeScore > awayScore ? homeTeam.id : awayTeam.id,
    is_overtime: overtimePeriods > 0,
    overtime_periods: overtimePeriods
  };
}
