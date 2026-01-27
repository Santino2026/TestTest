import { pool } from '../db/pool';

export interface EventResult {
  event_type: string;
  winner_id?: string;
  winner_name?: string;
  runner_up_id?: string;
  runner_up_name?: string;
  mvp_id?: string;
  mvp_name?: string;
  winning_team?: string;
  winning_score?: number;
  losing_score?: number;
  details: any;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  overall: number;
  [key: string]: any;
}

function getFullName(player: Player): string {
  return `${player.first_name} ${player.last_name}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function randomVariance(base: number, variance: number): number {
  return base + Math.floor(Math.random() * variance) - Math.floor(variance / 2);
}

function calculateTeamStrength(players: Player[], defaultOverall = 75): number {
  if (players.length === 0) return defaultOverall;
  return players.reduce((sum, p) => sum + (p.overall || defaultOverall), 0) / players.length;
}

function generateBoxScore(roster: Player[], totalScore: number, playerIdKey = 'id'): any[] {
  const scores: any[] = [];
  let remaining = totalScore;

  roster.forEach((player, idx) => {
    let share: number;
    if (idx === 0) {
      share = 0.2;
    } else if (idx < 3) {
      share = 0.15;
    } else if (idx < 5) {
      share = 0.12 + Math.random() * 0.08;
    } else {
      share = 0.04 + Math.random() * 0.04;
    }

    const pts = Math.floor(remaining * share * (0.8 + Math.random() * 0.4));
    scores.push({
      player_id: player[playerIdKey],
      name: getFullName(player),
      points: Math.min(pts, Math.max(remaining, 0)),
      rebounds: Math.floor(3 + Math.random() * 8),
      assists: Math.floor(2 + Math.random() * 6),
    });
    remaining = Math.max(0, remaining - scores[scores.length - 1].points);
  });

  if (remaining > 0 && scores.length > 0) {
    scores[0].points += remaining;
  }

  return scores;
}

export async function simulateRisingStars(seasonId: string): Promise<EventResult> {
  // Get young players (years_pro <= 3 to ensure we have enough participants)
  const result = await pool.query(
    `SELECT
      p.id, p.first_name, p.last_name, p.overall, p.years_pro,
      COALESCE(ps.points / NULLIF(ps.games_played, 0), 0) as ppg
    FROM players p
    LEFT JOIN player_season_stats ps ON p.id = ps.player_id AND ps.season_id = $1
    WHERE p.years_pro <= 3 AND p.team_id IS NOT NULL
    ORDER BY p.overall DESC
    LIMIT 24`,
    [seasonId]
  );

  if (result.rows.length < 10) {
    throw new Error('Not enough young players for Rising Stars Challenge (need at least 10)');
  }

  // Try traditional rookies vs sophomores format first
  const rookies = result.rows.filter((r: any) => r.years_pro === 0).slice(0, 10);
  const sophomores = result.rows.filter((r: any) => r.years_pro === 1).slice(0, 10);

  let team1: Player[];
  let team2: Player[];
  let team1Name: string;
  let team2Name: string;

  if (rookies.length >= 5 && sophomores.length >= 5) {
    // Traditional format: Rookies vs Sophomores
    team1 = rookies;
    team2 = sophomores;
    team1Name = 'rookies';
    team2Name = 'sophomores';
  } else {
    // Fallback: Split young players into Team A vs Team B
    const allYoung = result.rows.slice(0, 20);
    team1 = allYoung.filter((_: any, i: number) => i % 2 === 0).slice(0, 10);
    team2 = allYoung.filter((_: any, i: number) => i % 2 === 1).slice(0, 10);
    team1Name = 'team_a';
    team2Name = 'team_b';
  }

  const team1Strength = calculateTeamStrength(team1);
  const team2Strength = calculateTeamStrength(team2);

  const baseScore = 150;
  const variance = 30;

  const team1Score = clamp(
    baseScore + Math.floor((team1Strength - 70) * 2) + randomVariance(0, variance),
    120, 180
  );
  const team2Score = clamp(
    baseScore + Math.floor((team2Strength - 70) * 2) + randomVariance(0, variance),
    120, 180
  );

  const team1Won = team1Score > team2Score;
  const winningTeam = team1Won ? team1Name : team2Name;
  const winningRoster = team1Won ? team1 : team2;

  const mvpCandidates = winningRoster.slice(0, 3);
  const mvp = mvpCandidates[Math.floor(Math.random() * mvpCandidates.length)];

  const details = {
    [team1Name]: generateBoxScore(team1, team1Score),
    [team2Name]: generateBoxScore(team2, team2Score),
    format: rookies.length >= 5 && sophomores.length >= 5 ? 'rookies_vs_sophomores' : 'team_draft',
    mvp_stats: {
      player_id: mvp.id,
      name: getFullName(mvp),
      points: Math.floor(25 + Math.random() * 15),
      rebounds: Math.floor(5 + Math.random() * 5),
      assists: Math.floor(4 + Math.random() * 6),
    }
  };

  const winningScore = team1Won ? team1Score : team2Score;
  const losingScore = team1Won ? team2Score : team1Score;

  await pool.query(
    `INSERT INTO all_star_events
     (season_id, event_type, mvp_id, winning_team, winning_score, losing_score, details)
     VALUES ($1, 'rising_stars', $2, $3, $4, $5, $6)
     ON CONFLICT (season_id, event_type) DO UPDATE
     SET mvp_id = $2, winning_team = $3, winning_score = $4, losing_score = $5, details = $6`,
    [seasonId, mvp.id, winningTeam, winningScore, losingScore, JSON.stringify(details)]
  );

  return {
    event_type: 'rising_stars',
    mvp_id: mvp.id,
    mvp_name: getFullName(mvp),
    winning_team: winningTeam,
    winning_score: winningScore,
    losing_score: losingScore,
    details
  };
}

export async function simulateSkillsChallenge(seasonId: string): Promise<EventResult> {
  const result = await pool.query(
    `SELECT p.id, p.first_name, p.last_name, p.position, p.overall,
            COALESCE(pa.ball_handling, p.overall, 50) as ball_handling,
            COALESCE(pa.passing_accuracy, p.overall, 50) as passing_accuracy,
            COALESCE(pa.three_point, p.overall, 50) as three_point,
            COALESCE(pa.speed, p.overall, 50) as speed
     FROM players p
     LEFT JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.position IN ('PG', 'SG') AND p.team_id IS NOT NULL
     ORDER BY (COALESCE(pa.ball_handling, p.overall, 50) + COALESCE(pa.passing_accuracy, p.overall, 50) + COALESCE(pa.speed, p.overall, 50)) DESC
     LIMIT 8`,
    []
  );

  if (result.rows.length < 2) {
    throw new Error('Not enough guards available for Skills Challenge (need at least 2)');
  }

  const participants = result.rows.map((p: any) => ({
    ...p,
    skill_score: (p.ball_handling + p.passing_accuracy + p.three_point + p.speed) / 4,
  }));

  function simulateRound(matchups: any[]): any[] {
    const winners: any[] = [];
    for (let i = 0; i < matchups.length; i += 2) {
      const p1 = matchups[i];
      const p2 = matchups[i + 1];
      if (!p2) {
        winners.push(p1);
        continue;
      }

      p1.time = clamp(30 - (p1.skill_score - 70) * 0.3 + (Math.random() * 6 - 3), 20, 40);
      p2.time = clamp(30 - (p2.skill_score - 70) * 0.3 + (Math.random() * 6 - 3), 20, 40);

      winners.push(p1.time < p2.time ? p1 : p2);
    }
    return winners;
  }

  const quarterFinals = [...participants];
  const semiFinals = simulateRound(quarterFinals);
  const finals = simulateRound(semiFinals);
  const winner = simulateRound(finals)[0];
  const runnerUp = finals.find((p: any) => p.id !== winner.id);

  const details = {
    participants: participants.map((p: any) => ({
      player_id: p.id,
      name: getFullName(p),
      time: p.time?.toFixed(2) || null,
    })),
    bracket: {
      quarter_finals: quarterFinals.map((p: any) => p.id),
      semi_finals: semiFinals.map((p: any) => p.id),
      finals: finals.map((p: any) => p.id),
    },
    winner_time: winner.time?.toFixed(2),
  };

  await pool.query(
    `INSERT INTO all_star_events
     (season_id, event_type, winner_id, runner_up_id, details)
     VALUES ($1, 'skills', $2, $3, $4)
     ON CONFLICT (season_id, event_type) DO UPDATE
     SET winner_id = $2, runner_up_id = $3, details = $4`,
    [seasonId, winner.id, runnerUp?.id, JSON.stringify(details)]
  );

  return {
    event_type: 'skills',
    winner_id: winner.id,
    winner_name: getFullName(winner),
    runner_up_id: runnerUp?.id,
    runner_up_name: runnerUp ? getFullName(runnerUp) : undefined,
    details
  };
}

export async function simulateThreePointContest(seasonId: string): Promise<EventResult> {
  const result = await pool.query(
    `SELECT p.id, p.first_name, p.last_name, p.overall,
            COALESCE(pa.three_point, p.overall, 50) as three_point,
            COALESCE(pa.shot_iq, p.overall, 50) as shot_iq,
            COALESCE(pa.clutch, p.overall, 50) as clutch
     FROM players p
     LEFT JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.team_id IS NOT NULL
     ORDER BY COALESCE(pa.three_point, p.overall, 50) DESC
     LIMIT 8`
  );

  if (result.rows.length < 3) {
    throw new Error('Not enough shooters available for Three-Point Contest (need at least 3)');
  }

  const participants = result.rows.map((p: any) => ({
    ...p,
    shooting_ability: p.three_point * 0.7 + p.shot_iq * 0.2 + p.clutch * 0.1,
  }));

  function simulateRound(shooters: any[]): any[] {
    return shooters.map((p: any) => {
      const baseAccuracy = p.shooting_ability / 100;
      let totalScore = 0;
      const racks: number[] = [];

      for (let rack = 0; rack < 5; rack++) {
        let rackScore = 0;
        const isMoneyRack = rack === 4;

        for (let ball = 0; ball < 5; ball++) {
          const isMoneyBall = ball === 4 || isMoneyRack;
          const makeChance = baseAccuracy * (0.7 + Math.random() * 0.3);

          if (Math.random() < makeChance) {
            rackScore += isMoneyBall ? 2 : 1;
          }
        }
        racks.push(rackScore);
        totalScore += rackScore;
      }

      return { ...p, score: totalScore, racks };
    }).sort((a, b) => b.score - a.score);
  }

  const round1Results = simulateRound(participants);
  const finalists = round1Results.slice(0, 3);
  const finalResults = simulateRound(finalists);

  const winner = finalResults[0];
  const runnerUp = finalResults[1];

  const details = {
    round1: round1Results.map((p: any) => ({
      player_id: p.id,
      name: getFullName(p),
      score: p.score,
      racks: p.racks,
    })),
    finals: finalResults.map((p: any) => ({
      player_id: p.id,
      name: getFullName(p),
      score: p.score,
      racks: p.racks,
    })),
  };

  await pool.query(
    `INSERT INTO all_star_events
     (season_id, event_type, winner_id, runner_up_id, details)
     VALUES ($1, 'three_point', $2, $3, $4)
     ON CONFLICT (season_id, event_type) DO UPDATE
     SET winner_id = $2, runner_up_id = $3, details = $4`,
    [seasonId, winner.id, runnerUp.id, JSON.stringify(details)]
  );

  return {
    event_type: 'three_point',
    winner_id: winner.id,
    winner_name: getFullName(winner),
    runner_up_id: runnerUp.id,
    runner_up_name: getFullName(runnerUp),
    details
  };
}

const DUNK_DESCRIPTIONS = [
  'Windmill from the free-throw line',
  '360 between-the-legs',
  'Double-pump reverse',
  'One-handed tomahawk',
  'Behind-the-back slam',
  'Eastbay (between the legs)',
  'Alley-oop off the backboard',
  'Honey dip (elbow in rim)',
];

export async function simulateDunkContest(seasonId: string): Promise<EventResult> {
  const result = await pool.query(
    `SELECT p.id, p.first_name, p.last_name, p.overall,
            COALESCE(pa.driving_dunk, p.overall, 50) as driving_dunk,
            COALESCE(pa.standing_dunk, p.overall, 50) as standing_dunk,
            COALESCE(pa.vertical, p.overall, 50) as vertical,
            COALESCE(pa.speed, p.overall, 50) as speed,
            COALESCE(pa.acceleration, p.overall, 50) as acceleration
     FROM players p
     LEFT JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.team_id IS NOT NULL
     ORDER BY (COALESCE(pa.driving_dunk, p.overall, 50) + COALESCE(pa.standing_dunk, p.overall, 50) + COALESCE(pa.vertical, p.overall, 50)) DESC
     LIMIT 4`
  );

  if (result.rows.length < 2) {
    throw new Error('Not enough dunkers available for Dunk Contest (need at least 2)');
  }

  const participants = result.rows.map((p: any) => ({
    ...p,
    dunk_ability: p.driving_dunk * 0.4 + p.standing_dunk * 0.3 + p.vertical * 0.2 + p.speed * 0.1,
  }));

  function simulateDunk(dunker: any) {
    const baseQuality = dunker.dunk_ability / 100;
    const creativity = Math.random() * 0.3;
    const execution = Math.random() * 0.2;
    const dunkScore = (baseQuality + creativity) * (0.8 + execution);

    const judgeScores = [1, 2, 3].map(() => {
      const score = 6 + Math.floor(dunkScore * 4 + Math.random() * 2);
      return clamp(score, 6, 10);
    });

    return {
      judges: judgeScores,
      total: judgeScores.reduce((a, b) => a + b, 0),
      description: DUNK_DESCRIPTIONS[Math.floor(Math.random() * DUNK_DESCRIPTIONS.length)],
    };
  }

  const round1 = participants.map((p: any) => {
    const dunk1 = simulateDunk(p);
    const dunk2 = simulateDunk(p);
    return {
      ...p,
      round1_dunks: [dunk1, dunk2],
      round1_total: dunk1.total + dunk2.total,
    };
  }).sort((a, b) => b.round1_total - a.round1_total);

  const finalists = round1.slice(0, 2).map((p: any) => {
    const dunk1 = simulateDunk(p);
    const dunk2 = simulateDunk(p);
    return {
      ...p,
      finals_dunks: [dunk1, dunk2],
      finals_total: dunk1.total + dunk2.total,
      grand_total: p.round1_total + dunk1.total + dunk2.total,
    };
  }).sort((a, b) => b.finals_total - a.finals_total);

  const winner = finalists[0];
  const runnerUp = finalists[1];

  const details = {
    round1: round1.map((p: any) => ({
      player_id: p.id,
      name: getFullName(p),
      dunks: p.round1_dunks,
      total: p.round1_total,
    })),
    finals: finalists.map((p: any) => ({
      player_id: p.id,
      name: getFullName(p),
      dunks: p.finals_dunks,
      round1_total: p.round1_total,
      finals_total: p.finals_total,
    })),
  };

  await pool.query(
    `INSERT INTO all_star_events
     (season_id, event_type, winner_id, runner_up_id, details)
     VALUES ($1, 'dunk', $2, $3, $4)
     ON CONFLICT (season_id, event_type) DO UPDATE
     SET winner_id = $2, runner_up_id = $3, details = $4`,
    [seasonId, winner.id, runnerUp.id, JSON.stringify(details)]
  );

  return {
    event_type: 'dunk',
    winner_id: winner.id,
    winner_name: getFullName(winner),
    runner_up_id: runnerUp.id,
    runner_up_name: getFullName(runnerUp),
    details
  };
}

export async function simulateAllStarGame(seasonId: string): Promise<EventResult> {
  const result = await pool.query(
    `SELECT
      ass.*, p.first_name, p.last_name, p.overall, p.position,
      pa.three_point, pa.inside_scoring
     FROM all_star_selections ass
     JOIN players p ON ass.player_id = p.id
     LEFT JOIN player_attributes pa ON p.id = pa.player_id
     WHERE ass.season_id = $1
     ORDER BY ass.conference, ass.is_starter DESC, ass.is_captain DESC, ass.votes DESC`,
    [seasonId]
  );

  const eastTeam = result.rows.filter((r: any) => r.conference === 'east' || r.conference === 'Eastern');
  const westTeam = result.rows.filter((r: any) => r.conference === 'west' || r.conference === 'Western');

  if (eastTeam.length === 0 || westTeam.length === 0) {
    throw new Error('All-Star selections must be made before simulating the game');
  }

  const eastStrength = calculateTeamStrength(eastTeam, 80);
  const westStrength = calculateTeamStrength(westTeam, 80);

  const baseScore = 170;
  const variance = 25;

  const eastScore = clamp(
    baseScore + Math.floor((eastStrength - 80) * 3) + randomVariance(0, variance),
    150, 200
  );
  const westScore = clamp(
    baseScore + Math.floor((westStrength - 80) * 3) + randomVariance(0, variance),
    150, 200
  );

  const eastWon = eastScore > westScore;
  const winningTeam = eastWon ? 'east' : 'west';
  const winningRoster = eastWon ? eastTeam : westTeam;

  if (winningRoster.length === 0) {
    throw new Error('Cannot select All-Star Game MVP - winning roster is empty');
  }

  const mvpCandidates = winningRoster.slice(0, Math.min(5, winningRoster.length));
  const mvp = mvpCandidates[Math.floor(Math.random() * Math.min(3, mvpCandidates.length))];

  function generateAllStarBoxScore(roster: any[], totalScore: number): any[] {
    const stats: any[] = [];
    let remaining = totalScore;

    roster.forEach((p, idx) => {
      const share = idx < 5 ? (0.12 + Math.random() * 0.08) : (0.04 + Math.random() * 0.04);
      const pts = Math.floor(remaining * share);
      stats.push({
        player_id: p.player_id,
        name: getFullName(p),
        points: Math.min(pts, Math.max(remaining, 0)),
        rebounds: Math.floor(3 + Math.random() * 10),
        assists: Math.floor(2 + Math.random() * 10),
        steals: Math.floor(Math.random() * 4),
        blocks: Math.floor(Math.random() * 3),
      });
      remaining = Math.max(0, remaining - stats[stats.length - 1].points);
    });

    if (remaining > 0 && stats.length > 0) {
      stats[0].points += remaining;
    }

    return stats;
  }

  const mvpStats = {
    player_id: mvp.player_id,
    name: getFullName(mvp),
    points: Math.floor(30 + Math.random() * 20),
    rebounds: Math.floor(8 + Math.random() * 8),
    assists: Math.floor(6 + Math.random() * 8),
    steals: Math.floor(1 + Math.random() * 3),
    blocks: Math.floor(Math.random() * 3),
  };

  const details = {
    east: generateAllStarBoxScore(eastTeam, eastScore),
    west: generateAllStarBoxScore(westTeam, westScore),
    quarters: [
      { east: Math.floor(eastScore * 0.25), west: Math.floor(westScore * 0.25) },
      { east: Math.floor(eastScore * 0.25), west: Math.floor(westScore * 0.25) },
      { east: Math.floor(eastScore * 0.25), west: Math.floor(westScore * 0.25) },
      { east: eastScore - Math.floor(eastScore * 0.75), west: westScore - Math.floor(westScore * 0.75) },
    ],
    mvp_stats: mvpStats,
  };

  const winningScore = eastWon ? eastScore : westScore;
  const losingScore = eastWon ? westScore : eastScore;

  await pool.query(
    `INSERT INTO all_star_events
     (season_id, event_type, mvp_id, winning_team, winning_score, losing_score, details)
     VALUES ($1, 'game', $2, $3, $4, $5, $6)
     ON CONFLICT (season_id, event_type) DO UPDATE
     SET mvp_id = $2, winning_team = $3, winning_score = $4, losing_score = $5, details = $6`,
    [seasonId, mvp.player_id, winningTeam, winningScore, losingScore, JSON.stringify(details)]
  );

  return {
    event_type: 'game',
    mvp_id: mvp.player_id,
    mvp_name: getFullName(mvp),
    winning_team: winningTeam,
    winning_score: winningScore,
    losing_score: losingScore,
    details
  };
}

export async function getEventResults(seasonId: string): Promise<EventResult[]> {
  const result = await pool.query(
    `SELECT
      ase.*,
      w.first_name as winner_first, w.last_name as winner_last,
      r.first_name as runner_up_first, r.last_name as runner_up_last,
      m.first_name as mvp_first, m.last_name as mvp_last
     FROM all_star_events ase
     LEFT JOIN players w ON ase.winner_id = w.id
     LEFT JOIN players r ON ase.runner_up_id = r.id
     LEFT JOIN players m ON ase.mvp_id = m.id
     WHERE ase.season_id = $1
     ORDER BY ase.simulated_at`,
    [seasonId]
  );

  return result.rows.map((r: any) => ({
    event_type: r.event_type,
    winner_id: r.winner_id,
    winner_name: r.winner_first ? `${r.winner_first} ${r.winner_last}` : undefined,
    runner_up_id: r.runner_up_id,
    runner_up_name: r.runner_up_first ? `${r.runner_up_first} ${r.runner_up_last}` : undefined,
    mvp_id: r.mvp_id,
    mvp_name: r.mvp_first ? `${r.mvp_first} ${r.mvp_last}` : undefined,
    winning_team: r.winning_team,
    winning_score: r.winning_score,
    losing_score: r.losing_score,
    details: r.details,
  }));
}
