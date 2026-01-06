// All-Star Event Simulation Logic
// Handles Rising Stars, Skills Challenge, 3PT Contest, Dunk Contest, and All-Star Game

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

// Rising Stars Challenge: Rookies vs Sophomores
export async function simulateRisingStars(seasonId: number): Promise<EventResult> {
  // Get rookies and sophomores
  const result = await pool.query(
    `SELECT
      p.id, p.first_name, p.last_name, p.overall, p.years_pro,
      COALESCE(ps.points / NULLIF(ps.games_played, 0), 0) as ppg
    FROM players p
    LEFT JOIN player_season_stats ps ON p.id = ps.player_id AND ps.season_id = $1
    WHERE p.years_pro <= 1 AND p.team_id IS NOT NULL
    ORDER BY p.overall DESC
    LIMIT 24`,
    [seasonId]
  );

  const rookies = result.rows.filter((r: any) => r.years_pro === 0).slice(0, 10);
  const sophomores = result.rows.filter((r: any) => r.years_pro === 1).slice(0, 10);

  // Verify we have enough players
  if (rookies.length === 0 || sophomores.length === 0) {
    throw new Error('Not enough rookies or sophomores for Rising Stars Challenge');
  }

  // Calculate team strength
  const rookieStrength = rookies.reduce((sum: number, p: any) => sum + p.overall, 0) / rookies.length;
  const sophStrength = sophomores.reduce((sum: number, p: any) => sum + p.overall, 0) / sophomores.length;

  // Simulate game (simplified)
  const baseScore = 150;
  const variance = 30;

  let rookieScore = baseScore + Math.floor((rookieStrength - 70) * 2) + Math.floor(Math.random() * variance) - variance/2;
  let sophScore = baseScore + Math.floor((sophStrength - 70) * 2) + Math.floor(Math.random() * variance) - variance/2;

  // Ensure valid scores
  rookieScore = Math.max(120, Math.min(180, rookieScore));
  sophScore = Math.max(120, Math.min(180, sophScore));

  // Determine winner and MVP
  const winningTeam = rookieScore > sophScore ? 'rookies' : 'sophomores';
  const winningRoster = winningTeam === 'rookies' ? rookies : sophomores;
  const losingRoster = winningTeam === 'rookies' ? sophomores : rookies;

  // MVP is best player on winning team (with some randomness)
  const mvpCandidates = winningRoster.slice(0, 3);
  const mvp = mvpCandidates[Math.floor(Math.random() * mvpCandidates.length)];

  // Generate box scores
  const generateBoxScore = (roster: any[], totalScore: number) => {
    const scores: any[] = [];
    let remaining = totalScore;

    roster.forEach((p: any, idx: number) => {
      const share = idx === 0 ? 0.2 : (idx < 3 ? 0.15 : 0.1);
      const pts = Math.floor(remaining * share * (0.8 + Math.random() * 0.4));
      scores.push({
        player_id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        points: Math.min(pts, remaining),
        rebounds: Math.floor(3 + Math.random() * 8),
        assists: Math.floor(2 + Math.random() * 6),
      });
      remaining -= scores[scores.length - 1].points;
    });

    // Distribute remaining
    if (remaining > 0 && scores.length > 0) {
      scores[0].points += remaining;
    }

    return scores;
  };

  const details = {
    rookies: generateBoxScore(rookies, rookieScore),
    sophomores: generateBoxScore(sophomores, sophScore),
    mvp_stats: {
      player_id: mvp.id,
      name: `${mvp.first_name} ${mvp.last_name}`,
      points: Math.floor(25 + Math.random() * 15),
      rebounds: Math.floor(5 + Math.random() * 5),
      assists: Math.floor(4 + Math.random() * 6),
    }
  };

  // Save to database
  await pool.query(
    `INSERT INTO all_star_events
     (season_id, event_type, mvp_id, winning_team, winning_score, losing_score, details)
     VALUES ($1, 'rising_stars', $2, $3, $4, $5, $6)
     ON CONFLICT (season_id, event_type) DO UPDATE
     SET mvp_id = $2, winning_team = $3, winning_score = $4, losing_score = $5, details = $6`,
    [seasonId, mvp.id, winningTeam,
     winningTeam === 'rookies' ? rookieScore : sophScore,
     winningTeam === 'rookies' ? sophScore : rookieScore,
     JSON.stringify(details)]
  );

  return {
    event_type: 'rising_stars',
    mvp_id: mvp.id,
    mvp_name: `${mvp.first_name} ${mvp.last_name}`,
    winning_team: winningTeam,
    winning_score: winningTeam === 'rookies' ? rookieScore : sophScore,
    losing_score: winningTeam === 'rookies' ? sophScore : rookieScore,
    details
  };
}

// Skills Challenge
export async function simulateSkillsChallenge(seasonId: number): Promise<EventResult> {
  // Get 8 best ball-handlers (guards)
  const result = await pool.query(
    `SELECT p.id, p.first_name, p.last_name, p.position, p.overall,
            pa.ball_handling, pa.passing_accuracy, pa.three_point, pa.speed
     FROM players p
     JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.position IN ('PG', 'SG') AND p.team_id IS NOT NULL
     ORDER BY (pa.ball_handling + pa.passing_accuracy + pa.speed) DESC
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

  // Bracket simulation
  const simulateRound = (matchups: any[]): any[] => {
    const winners: any[] = [];
    for (let i = 0; i < matchups.length; i += 2) {
      const p1 = matchups[i];
      const p2 = matchups[i + 1];
      if (!p2) {
        winners.push(p1);
        continue;
      }

      // Time-based: lower is better
      const p1Time = 30 - (p1.skill_score - 70) * 0.3 + (Math.random() * 6 - 3);
      const p2Time = 30 - (p2.skill_score - 70) * 0.3 + (Math.random() * 6 - 3);

      p1.time = Math.max(20, Math.min(40, p1Time));
      p2.time = Math.max(20, Math.min(40, p2Time));

      winners.push(p1.time < p2.time ? p1 : p2);
    }
    return winners;
  };

  // Quarter-finals, Semi-finals, Finals
  const quarterFinals = [...participants];
  const semiFinals = simulateRound(quarterFinals);
  const finals = simulateRound(semiFinals);
  const winner = simulateRound(finals)[0];

  // Determine runner-up
  const runnerUp = finals.find((p: any) => p.id !== winner.id);

  const details = {
    participants: participants.map((p: any) => ({
      player_id: p.id,
      name: `${p.first_name} ${p.last_name}`,
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
    winner_name: `${winner.first_name} ${winner.last_name}`,
    runner_up_id: runnerUp?.id,
    runner_up_name: runnerUp ? `${runnerUp.first_name} ${runnerUp.last_name}` : undefined,
    details
  };
}

// Three-Point Contest
export async function simulateThreePointContest(seasonId: number): Promise<EventResult> {
  // Get 8 best 3PT shooters
  const result = await pool.query(
    `SELECT p.id, p.first_name, p.last_name, p.overall,
            pa.three_point, pa.shot_iq, pa.clutch
     FROM players p
     JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.team_id IS NOT NULL
     ORDER BY pa.three_point DESC
     LIMIT 8`
  );

  if (result.rows.length < 3) {
    throw new Error('Not enough shooters available for Three-Point Contest (need at least 3)');
  }

  const participants = result.rows.map((p: any) => ({
    ...p,
    shooting_ability: (p.three_point * 0.7 + p.shot_iq * 0.2 + p.clutch * 0.1),
  }));

  // Round 1: 5 racks, 5 balls each = 25 balls, max 34 points (moneyball rack)
  const simulateRound = (shooters: any[], isFinal: boolean = false) => {
    return shooters.map((p: any) => {
      const baseAccuracy = p.shooting_ability / 100;
      const rounds = isFinal ? 1 : 1;
      let totalScore = 0;
      const racks: number[] = [];

      for (let round = 0; round < rounds; round++) {
        for (let rack = 0; rack < 5; rack++) {
          let rackScore = 0;
          const isMoneyRack = rack === 4; // Last rack is money rack

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
      }

      return { ...p, score: totalScore, racks };
    }).sort((a: any, b: any) => b.score - a.score);
  };

  // First round - all 8
  const round1Results = simulateRound(participants);

  // Finals - top 3
  const finalists = round1Results.slice(0, 3);
  const finalResults = simulateRound(finalists, true);

  const winner = finalResults[0];
  const runnerUp = finalResults[1];

  const details = {
    round1: round1Results.map((p: any) => ({
      player_id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      score: p.score,
      racks: p.racks,
    })),
    finals: finalResults.map((p: any) => ({
      player_id: p.id,
      name: `${p.first_name} ${p.last_name}`,
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
    winner_name: `${winner.first_name} ${winner.last_name}`,
    runner_up_id: runnerUp.id,
    runner_up_name: `${runnerUp.first_name} ${runnerUp.last_name}`,
    details
  };
}

// Slam Dunk Contest
export async function simulateDunkContest(seasonId: number): Promise<EventResult> {
  // Get 4 best dunkers (athleticism + dunking)
  const result = await pool.query(
    `SELECT p.id, p.first_name, p.last_name, p.overall,
            pa.driving_dunk, pa.standing_dunk, pa.vertical, pa.speed, pa.acceleration
     FROM players p
     JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.team_id IS NOT NULL
     ORDER BY (pa.driving_dunk + pa.standing_dunk + pa.vertical) DESC
     LIMIT 4`
  );

  if (result.rows.length < 2) {
    throw new Error('Not enough dunkers available for Dunk Contest (need at least 2)');
  }

  const participants = result.rows.map((p: any) => ({
    ...p,
    dunk_ability: (p.driving_dunk * 0.4 + p.standing_dunk * 0.3 + p.vertical * 0.2 + p.speed * 0.1),
  }));

  // Two rounds, 2 dunks each
  // Judges score 6-10 each, 3 judges = 18-30 per dunk
  const simulateDunk = (dunker: any) => {
    const baseQuality = dunker.dunk_ability / 100;
    const creativity = Math.random() * 0.3; // Random creativity bonus
    const execution = Math.random() * 0.2; // Execution variance

    const dunkScore = (baseQuality + creativity) * (0.8 + execution);

    // Convert to judge scores (6-10)
    const judgeScores = [1, 2, 3].map(() => {
      const score = 6 + Math.floor(dunkScore * 4 + Math.random() * 2);
      return Math.min(10, Math.max(6, score));
    });

    return {
      judges: judgeScores,
      total: judgeScores.reduce((a, b) => a + b, 0),
      description: generateDunkDescription(),
    };
  };

  const generateDunkDescription = () => {
    const dunks = [
      'Windmill from the free-throw line',
      '360 between-the-legs',
      'Double-pump reverse',
      'One-handed tomahawk',
      'Behind-the-back slam',
      'Eastbay (between the legs)',
      'Alley-oop off the backboard',
      'Honey dip (elbow in rim)',
    ];
    return dunks[Math.floor(Math.random() * dunks.length)];
  };

  // Round 1
  const round1 = participants.map((p: any) => {
    const dunk1 = simulateDunk(p);
    const dunk2 = simulateDunk(p);
    return {
      ...p,
      round1_dunks: [dunk1, dunk2],
      round1_total: dunk1.total + dunk2.total,
    };
  }).sort((a: any, b: any) => b.round1_total - a.round1_total);

  // Finals (top 2)
  const finalists = round1.slice(0, 2).map((p: any) => {
    const dunk1 = simulateDunk(p);
    const dunk2 = simulateDunk(p);
    return {
      ...p,
      finals_dunks: [dunk1, dunk2],
      finals_total: dunk1.total + dunk2.total,
      grand_total: p.round1_total + dunk1.total + dunk2.total,
    };
  }).sort((a: any, b: any) => b.finals_total - a.finals_total);

  const winner = finalists[0];
  const runnerUp = finalists[1];

  const details = {
    round1: round1.map((p: any) => ({
      player_id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      dunks: p.round1_dunks,
      total: p.round1_total,
    })),
    finals: finalists.map((p: any) => ({
      player_id: p.id,
      name: `${p.first_name} ${p.last_name}`,
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
    winner_name: `${winner.first_name} ${winner.last_name}`,
    runner_up_id: runnerUp.id,
    runner_up_name: `${runnerUp.first_name} ${runnerUp.last_name}`,
    details
  };
}

// All-Star Game
export async function simulateAllStarGame(seasonId: number): Promise<EventResult> {
  // Get All-Star selections
  const result = await pool.query(
    `SELECT
      ass.*, p.first_name, p.last_name, p.overall, p.position,
      pa.three_point, pa.inside_scoring
     FROM all_star_selections ass
     JOIN players p ON ass.player_id = p.id
     JOIN player_attributes pa ON p.id = pa.player_id
     WHERE ass.season_id = $1
     ORDER BY ass.conference, ass.is_captain DESC, ass.votes DESC`,
    [seasonId]
  );

  const eastTeam = result.rows.filter((r: any) => r.conference === 'east' || r.conference === 'Eastern');
  const westTeam = result.rows.filter((r: any) => r.conference === 'west' || r.conference === 'Western');

  // Verify we have All-Stars selected
  if (eastTeam.length === 0 || westTeam.length === 0) {
    throw new Error('All-Star selections must be made before simulating the game');
  }

  // Calculate team strengths
  const eastStrength = eastTeam.reduce((sum: number, p: any) => sum + p.overall, 0) / eastTeam.length;
  const westStrength = westTeam.reduce((sum: number, p: any) => sum + p.overall, 0) / westTeam.length;

  // All-Star game is high-scoring
  const baseScore = 170;
  const variance = 25;

  let eastScore = baseScore + Math.floor((eastStrength - 80) * 3) + Math.floor(Math.random() * variance) - variance/2;
  let westScore = baseScore + Math.floor((westStrength - 80) * 3) + Math.floor(Math.random() * variance) - variance/2;

  // Ensure valid scores
  eastScore = Math.max(150, Math.min(200, eastScore));
  westScore = Math.max(150, Math.min(200, westScore));

  const winningTeam = eastScore > westScore ? 'east' : 'west';
  const winningRoster = winningTeam === 'east' ? eastTeam : westTeam;

  // Validate winning roster before MVP selection
  if (winningRoster.length === 0) {
    throw new Error('Cannot select All-Star Game MVP - winning roster is empty');
  }

  // Select MVP from winning team
  const mvpCandidates = winningRoster.slice(0, Math.min(5, winningRoster.length)); // Top starters
  const mvp = mvpCandidates[Math.floor(Math.random() * Math.min(3, mvpCandidates.length))];

  // Generate stats
  const generateTeamStats = (roster: any[], totalScore: number) => {
    const stats: any[] = [];
    let remaining = totalScore;

    roster.forEach((p: any, idx: number) => {
      const share = idx < 5 ? (0.12 + Math.random() * 0.08) : (0.04 + Math.random() * 0.04);
      const pts = Math.floor(remaining * share);
      stats.push({
        player_id: p.player_id,
        name: `${p.first_name} ${p.last_name}`,
        points: Math.min(pts, Math.max(remaining, 0)),
        rebounds: Math.floor(3 + Math.random() * 10),
        assists: Math.floor(2 + Math.random() * 10),
        steals: Math.floor(Math.random() * 4),
        blocks: Math.floor(Math.random() * 3),
      });
      remaining = Math.max(0, remaining - stats[stats.length - 1].points);
    });

    // Distribute any remaining
    if (remaining > 0 && stats.length > 0) {
      stats[0].points += remaining;
    }

    return stats;
  };

  // MVP gets big stats
  const mvpStats = {
    player_id: mvp.player_id,
    name: `${mvp.first_name} ${mvp.last_name}`,
    points: Math.floor(30 + Math.random() * 20),
    rebounds: Math.floor(8 + Math.random() * 8),
    assists: Math.floor(6 + Math.random() * 8),
    steals: Math.floor(1 + Math.random() * 3),
    blocks: Math.floor(Math.random() * 3),
  };

  const details = {
    east: generateTeamStats(eastTeam, eastScore),
    west: generateTeamStats(westTeam, westScore),
    quarters: [
      { east: Math.floor(eastScore * 0.25), west: Math.floor(westScore * 0.25) },
      { east: Math.floor(eastScore * 0.25), west: Math.floor(westScore * 0.25) },
      { east: Math.floor(eastScore * 0.25), west: Math.floor(westScore * 0.25) },
      { east: eastScore - Math.floor(eastScore * 0.75), west: westScore - Math.floor(westScore * 0.75) },
    ],
    mvp_stats: mvpStats,
  };

  await pool.query(
    `INSERT INTO all_star_events
     (season_id, event_type, mvp_id, winning_team, winning_score, losing_score, details)
     VALUES ($1, 'game', $2, $3, $4, $5, $6)
     ON CONFLICT (season_id, event_type) DO UPDATE
     SET mvp_id = $2, winning_team = $3, winning_score = $4, losing_score = $5, details = $6`,
    [seasonId, mvp.player_id, winningTeam,
     winningTeam === 'east' ? eastScore : westScore,
     winningTeam === 'east' ? westScore : eastScore,
     JSON.stringify(details)]
  );

  return {
    event_type: 'game',
    mvp_id: mvp.player_id,
    mvp_name: `${mvp.first_name} ${mvp.last_name}`,
    winning_team: winningTeam,
    winning_score: winningTeam === 'east' ? eastScore : westScore,
    losing_score: winningTeam === 'east' ? westScore : eastScore,
    details
  };
}

// Get event results
export async function getEventResults(seasonId: number) {
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
    winner_name: r.winner_first ? `${r.winner_first} ${r.winner_last}` : null,
    runner_up_id: r.runner_up_id,
    runner_up_name: r.runner_up_first ? `${r.runner_up_first} ${r.runner_up_last}` : null,
    mvp_id: r.mvp_id,
    mvp_name: r.mvp_first ? `${r.mvp_first} ${r.mvp_last}` : null,
    winning_team: r.winning_team,
    winning_score: r.winning_score,
    losing_score: r.losing_score,
    details: r.details,
    simulated_at: r.simulated_at,
  }));
}
