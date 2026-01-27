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
    // Cache Motor trait check on player (avoid .some() every call)
    if ((player as any)._hasMotor === undefined) {
      (player as any)._hasMotor = player.traits.some(t => t.name === 'Motor');
    }
    const finalFatigue = (player as any)._hasMotor ? fatigueGain * 0.6 : fatigueGain;

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

  for (let i = 0; i < onCourt.length; i++) {
    const player = onCourt[i];
    const needsRest = player.fatigue > 70 || player.fouls >= 4;
    const mustSub = player.fatigue > 90 || player.fouls >= 6;

    if (!needsRest && !mustSub) continue;

    const playerPosIdx = POSITION_ORDER.indexOf(player.position);
    let bestSub: SimPlayer | null = null;
    let bestScore = -1;

    for (const sub of team.bench) {
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
      // Swap player and sub
      player.is_on_court = false;
      bestSub.is_on_court = true;
      onCourt[i] = bestSub;
      // Keep bench in sync
      const subIdx = team.bench.indexOf(bestSub);
      if (subIdx !== -1) {
        team.bench[subIdx] = player;
      }
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
  // Build player lookup map once per quarter (O(1) lookups vs O(n) iterations)
  const playerMap = new Map<string, SimPlayer>();
  for (const p of homeTeam.roster) playerMap.set(p.id, p);
  for (const p of awayTeam.roster) playerMap.set(p.id, p);

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

      // Track team-level scoring categories
      const teamStats = isHome ? homeTeam : awayTeam;
      if (context.is_fast_break) {
        (teamStats as any).__fast_break_points = ((teamStats as any).__fast_break_points || 0) + result.points_scored;
      }
      if (result.is_offensive_rebound) {
        (teamStats as any).__second_chance_points = ((teamStats as any).__second_chance_points || 0) + result.points_scored;
      }
      const scoringPlay = result.plays.find(p => p.type === 'made_shot');
      if (scoringPlay) {
        const shotType = scoringPlay.shot_type;
        const isPaintShot = shotType === 'dunk' || shotType === 'layup' || shotType === 'floater' ||
          shotType === 'putback' || shotType === 'tip_in' || shotType === 'alley_oop' ||
          shotType === 'hook_shot';
        if (isPaintShot) {
          (teamStats as any).__points_in_paint = ((teamStats as any).__points_in_paint || 0) + result.points_scored;
        }
      }

      for (const player of offensiveTeam.on_court) {
        player.stats.plus_minus += result.points_scored;
      }
      for (const player of defensiveTeam.on_court) {
        player.stats.plus_minus -= result.points_scored;
      }
    }

    // Update stats directly by player ID (O(n) instead of O(n²))
    for (const play of result.plays) {
      if (play.primary_player_id) {
        const primary = playerMap.get(play.primary_player_id);
        if (primary) updatePlayerStats(primary, play);
      }
      if (play.secondary_player_id) {
        const secondary = playerMap.get(play.secondary_player_id);
        if (secondary) updatePlayerStats(secondary, play);
      }
    }

    updateFatigue(offensiveTeam.on_court, result.time_elapsed);
    updateFatigue(defensiveTeam.on_court, result.time_elapsed);
    // Use bench arrays instead of filtering every possession
    recoverFatigue(offensiveTeam.bench, result.time_elapsed);
    recoverFatigue(defensiveTeam.bench, result.time_elapsed);

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

// Fast simulation - generates realistic scores and stats without play-by-play
// Used for preseason games where detailed simulation is unnecessary
export function simulateGameFast(homeTeam: SimTeam, awayTeam: SimTeam): GameResult {
  const gameId = uuidv4();

  // Calculate team ratings (avg of top 8 players by overall)
  const homeRating = getTeamRating(homeTeam);
  const awayRating = getTeamRating(awayTeam);

  // Generate final scores (100-120 range typical)
  const baseScore = 105;
  const homeAdvantage = 3;
  const variance = 15;

  const ratingDiff = (homeRating - awayRating) / 10;
  let homeScore = Math.round(baseScore + homeAdvantage + ratingDiff + (Math.random() - 0.5) * variance);
  let awayScore = Math.round(baseScore - ratingDiff + (Math.random() - 0.5) * variance);

  // Ensure reasonable scores and no ties
  homeScore = Math.max(85, Math.min(130, homeScore));
  awayScore = Math.max(85, Math.min(130, awayScore));

  // Break ties randomly
  if (homeScore === awayScore) {
    if (Math.random() > 0.5) homeScore += 1;
    else awayScore += 1;
  }

  // Break into quarters
  const quarters = generateQuarterScores(homeScore, awayScore);

  // Generate player stats
  const homePlayerStats = generatePlayerStatsFast(homeTeam, homeScore);
  const awayPlayerStats = generatePlayerStatsFast(awayTeam, awayScore);

  // Generate team stats from player stats
  const homeStats = aggregateTeamStats(homePlayerStats);
  const awayStats = aggregateTeamStats(awayPlayerStats);

  return {
    id: gameId,
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    home_score: homeScore,
    away_score: awayScore,
    quarters,
    plays: [], // Empty - not needed for preseason
    home_stats: homeStats,
    away_stats: awayStats,
    home_player_stats: homePlayerStats,
    away_player_stats: awayPlayerStats,
    winner_id: homeScore > awayScore ? homeTeam.id : awayTeam.id,
    is_overtime: false,
    overtime_periods: 0
  };
}

function getTeamRating(team: SimTeam): number {
  const sorted = [...team.roster].sort((a, b) => b.overall - a.overall);
  const top8 = sorted.slice(0, 8);
  if (top8.length === 0) return 70;
  return top8.reduce((sum, p) => sum + p.overall, 0) / top8.length;
}

function generateQuarterScores(homeTotal: number, awayTotal: number): QuarterResult[] {
  const quarters: QuarterResult[] = [];
  let homeRemaining = homeTotal;
  let awayRemaining = awayTotal;

  for (let q = 1; q <= 4; q++) {
    const isLast = q === 4;
    const homePts = isLast ? homeRemaining : Math.round(homeTotal * (0.22 + Math.random() * 0.06));
    const awayPts = isLast ? awayRemaining : Math.round(awayTotal * (0.22 + Math.random() * 0.06));
    quarters.push({
      quarter: q,
      home_points: homePts,
      away_points: awayPts,
      plays: []
    });
    homeRemaining -= homePts;
    awayRemaining -= awayPts;
  }
  return quarters;
}

function generatePlayerStatsFast(team: SimTeam, teamScore: number): Array<PlayerGameStats & { player_id: string }> {
  const stats: Array<PlayerGameStats & { player_id: string }> = [];
  const starters = team.starters?.length >= 5 ? team.starters : team.roster.slice(0, 5);
  const bench = team.roster.filter(p => !starters.some(s => s.id === p.id)).slice(0, 8);

  let remainingPoints = teamScore;

  for (const player of [...starters, ...bench]) {
    const isStarter = starters.some(s => s.id === player.id);
    const minutes = isStarter ? 28 + Math.random() * 8 : 8 + Math.random() * 12;

    // Points based on overall rating and minutes
    const pointShare = (player.overall / 100) * (minutes / 240) * 2.5;
    const points = Math.min(remainingPoints, Math.round(teamScore * pointShare * (0.8 + Math.random() * 0.4)));
    remainingPoints -= points;

    // Generate other stats proportionally
    const fga = Math.max(1, Math.round(points / 1.1));
    const fgm = Math.round(fga * 0.45);
    const threePa = Math.round(fga * 0.35);
    const threePm = Math.round(threePa * 0.36);
    const oreb = Math.round(Math.random() * 2);
    const dreb = Math.round(2 + Math.random() * 4);

    stats.push({
      player_id: player.id,
      minutes: Math.round(minutes),
      points,
      fgm,
      fga,
      three_pm: threePm,
      three_pa: threePa,
      ftm: Math.round(points * 0.15),
      fta: Math.round(points * 0.2),
      oreb,
      dreb,
      rebounds: oreb + dreb,
      assists: Math.round(1 + Math.random() * 5),
      steals: Math.round(Math.random() * 2),
      blocks: Math.round(Math.random() * 1.5),
      turnovers: Math.round(Math.random() * 3),
      fouls: Math.round(1 + Math.random() * 3),
      plus_minus: 0
    });
  }
  return stats;
}

function aggregateTeamStats(playerStats: Array<PlayerGameStats & { player_id: string }>): TeamGameStats {
  const stats: TeamGameStats = {
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

  for (const ps of playerStats) {
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

  // Estimate special scoring categories
  stats.fast_break_points = Math.round(stats.points * 0.12);
  stats.points_in_paint = Math.round(stats.points * 0.45);
  stats.second_chance_points = Math.round(stats.points * 0.10);

  return stats;
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

  // Assign tracked team-level scoring categories
  homeStats.fast_break_points = (homeTeam as any).__fast_break_points || 0;
  homeStats.points_in_paint = (homeTeam as any).__points_in_paint || 0;
  homeStats.second_chance_points = (homeTeam as any).__second_chance_points || 0;
  awayStats.fast_break_points = (awayTeam as any).__fast_break_points || 0;
  awayStats.points_in_paint = (awayTeam as any).__points_in_paint || 0;
  awayStats.second_chance_points = (awayTeam as any).__second_chance_points || 0;

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
