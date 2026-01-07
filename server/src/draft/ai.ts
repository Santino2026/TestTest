// AI Draft Logic
// Handles CPU team draft picks using Best Player Available + Team Needs evaluation

import { pool } from '../db/pool';

export interface TeamNeed {
  position: string;
  need_score: number; // 0-100, higher = more needed
  starter_overall: number;
  depth: number;
}

export interface ProspectEvaluation {
  prospect_id: string;
  first_name: string;
  last_name: string;
  position: string;
  overall: number;
  potential: number;
  bpa_score: number;
  need_score: number;
  total_score: number;
}

// Position groupings for need evaluation
const POSITION_GROUPS: Record<string, string[]> = {
  PG: ['PG'],
  SG: ['SG', 'PG'],
  SF: ['SF', 'SG'],
  PF: ['PF', 'SF'],
  C: ['C', 'PF'],
};

// Evaluate team needs based on roster
export async function evaluateTeamNeeds(teamId: string): Promise<TeamNeed[]> {
  // Get team roster with positions and overalls
  const rosterResult = await pool.query(
    `SELECT p.position, p.overall, p.id
     FROM players p
     WHERE p.team_id = $1
     ORDER BY p.overall DESC`,
    [teamId]
  );

  const roster = rosterResult.rows;
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
  const needs: TeamNeed[] = [];

  for (const pos of positions) {
    // Find players who can play this position
    const eligiblePlayers = roster.filter((p: any) =>
      POSITION_GROUPS[pos]?.includes(p.position)
    );

    // Get best player at position (starter)
    const starter = eligiblePlayers[0];
    const starterOverall = starter?.overall || 0;

    // Calculate depth (players who can reasonably play this position)
    const depth = eligiblePlayers.length;

    // Calculate need score (higher = more needed)
    let needScore = 0;

    if (depth === 0) {
      needScore = 100; // Critical need - no one at position
    } else if (starterOverall < 65) {
      needScore = 90 - starterOverall; // Below average starter
    } else if (starterOverall < 75) {
      needScore = 75 - starterOverall + 10; // Average starter
    } else if (depth < 2) {
      needScore = 30; // Good starter but no depth
    } else {
      needScore = Math.max(0, 20 - (starterOverall - 75)); // Low need
    }

    needs.push({
      position: pos,
      need_score: Math.max(0, Math.min(100, needScore)),
      starter_overall: starterOverall,
      depth,
    });
  }

  return needs;
}

// Get Best Player Available score based on overall and potential
export function calculateBPAScore(overall: number, potential: number, mockPosition: number): number {
  // Weight: 60% overall, 30% potential, 10% mock draft position value
  const overallScore = overall * 0.6;
  const potentialScore = potential * 0.3;
  const mockScore = Math.max(0, (60 - mockPosition)) * 0.1; // Bonus for being higher on mock draft

  return overallScore + potentialScore + mockScore;
}

// Evaluate all available prospects for a team
export async function evaluateProspects(
  teamId: string,
  seasonId: string
): Promise<ProspectEvaluation[]> {
  // Get team needs
  const needs = await evaluateTeamNeeds(teamId);
  const needsMap = new Map(needs.map(n => [n.position, n.need_score]));

  // Get available prospects
  const prospectsResult = await pool.query(
    `SELECT id, first_name, last_name, position, overall, potential, mock_draft_position
     FROM draft_prospects
     WHERE season_id = $1 AND is_drafted = false
     ORDER BY mock_draft_position`,
    [seasonId]
  );

  const evaluations: ProspectEvaluation[] = [];

  for (const prospect of prospectsResult.rows) {
    const bpaScore = calculateBPAScore(
      prospect.overall,
      prospect.potential,
      prospect.mock_draft_position
    );

    // Get need score for prospect's position
    const needScore = needsMap.get(prospect.position) || 50;

    // Total score: 70% BPA, 30% team need
    // This ensures we don't completely ignore BPA for team needs
    const totalScore = bpaScore * 0.7 + needScore * 0.3;

    evaluations.push({
      prospect_id: prospect.id,
      first_name: prospect.first_name,
      last_name: prospect.last_name,
      position: prospect.position,
      overall: prospect.overall,
      potential: prospect.potential,
      bpa_score: bpaScore,
      need_score: needScore,
      total_score: totalScore,
    });
  }

  // Sort by total score descending
  evaluations.sort((a, b) => b.total_score - a.total_score);

  return evaluations;
}

// Select the best prospect for AI team
export async function selectAIPick(teamId: string, seasonId: string): Promise<ProspectEvaluation | null> {
  const evaluations = await evaluateProspects(teamId, seasonId);

  if (evaluations.length === 0) {
    return null;
  }

  // Add some randomness - 80% pick top choice, 15% pick second, 5% pick third
  const rand = Math.random();
  if (rand < 0.8 || evaluations.length === 1) {
    return evaluations[0];
  } else if (rand < 0.95 || evaluations.length === 2) {
    return evaluations[1];
  } else {
    return evaluations[Math.min(2, evaluations.length - 1)];
  }
}

// Get current draft state
export async function getDraftState(seasonId: string) {
  // Get total picks made
  const picksResult = await pool.query(
    `SELECT COUNT(*) as picks_made FROM draft_prospects WHERE season_id = $1 AND is_drafted = true`,
    [seasonId]
  );
  const picksMade = parseInt(picksResult.rows[0].picks_made);

  // Calculate current pick (1-60)
  const currentPick = picksMade + 1;
  const currentRound = currentPick <= 30 ? 1 : 2;
  const pickInRound = currentRound === 1 ? currentPick : currentPick - 30;

  // Draft is complete after 60 picks
  const isDraftComplete = picksMade >= 60;

  return {
    picks_made: picksMade,
    current_pick: currentPick,
    current_round: currentRound,
    pick_in_round: pickInRound,
    is_draft_complete: isDraftComplete,
  };
}

// Get team picking at specific position
export async function getTeamAtPick(seasonId: string, pickNumber: number): Promise<string | null> {
  const round = pickNumber <= 30 ? 1 : 2;
  const pickInRound = round === 1 ? pickNumber : pickNumber - 30;

  if (round === 1) {
    // First round: lottery results for 1-14, then by record for 15-30
    if (pickInRound <= 14) {
      const result = await pool.query(
        `SELECT team_id FROM draft_lottery
         WHERE season_id = $1 AND post_lottery_position = $2`,
        [seasonId, pickInRound]
      );
      return result.rows[0]?.team_id || null;
    } else {
      // Non-lottery picks (15-30): ordered by wins ascending
      const result = await pool.query(
        `SELECT t.id
         FROM standings s
         JOIN teams t ON s.team_id = t.id
         WHERE s.season_id = $1
           AND t.id NOT IN (SELECT team_id FROM draft_lottery WHERE season_id = $1)
         ORDER BY s.wins ASC, s.losses DESC
         LIMIT 1 OFFSET $2`,
        [seasonId, pickInRound - 15]
      );
      return result.rows[0]?.id || null;
    }
  } else {
    // Second round: reverse of first round
    const firstRoundPick = 31 - pickInRound;
    return getTeamAtPick(seasonId, firstRoundPick);
  }
}

// Build full draft order from draft_picks table (respects traded picks)
export async function buildDraftOrder(seasonId: string): Promise<{ pick: number; round: number; team_id: string; team_name: string; abbreviation: string; original_team_id: string; was_traded: boolean }[]> {
  // Try to get from draft_picks table first (respects traded picks)
  const picksResult = await pool.query(
    `SELECT dp.pick_number, dp.round, dp.current_team_id, dp.original_team_id, dp.was_traded,
            t.name, t.abbreviation
     FROM draft_picks dp
     JOIN teams t ON dp.current_team_id = t.id
     WHERE dp.season_id = $1
     ORDER BY dp.pick_number`,
    [seasonId]
  );

  // If draft_picks table is populated, use it
  if (picksResult.rows.length > 0) {
    return picksResult.rows.map((row: any) => ({
      pick: row.pick_number,
      round: row.round,
      team_id: row.current_team_id,
      team_name: row.name,
      abbreviation: row.abbreviation,
      original_team_id: row.original_team_id,
      was_traded: row.was_traded || false,
    }));
  }

  // Fallback to old logic if draft_picks not yet populated (backwards compatibility)
  const order: { pick: number; round: number; team_id: string; team_name: string; abbreviation: string; original_team_id: string; was_traded: boolean }[] = [];

  // Get lottery results (picks 1-14)
  const lotteryResult = await pool.query(
    `SELECT dl.team_id, dl.post_lottery_position, t.name, t.abbreviation
     FROM draft_lottery dl
     JOIN teams t ON dl.team_id = t.id
     WHERE dl.season_id = $1
     ORDER BY dl.post_lottery_position`,
    [seasonId]
  );

  for (const row of lotteryResult.rows) {
    order.push({
      pick: row.post_lottery_position,
      round: 1,
      team_id: row.team_id,
      team_name: row.name,
      abbreviation: row.abbreviation,
      original_team_id: row.team_id,
      was_traded: false,
    });
  }

  // Get non-lottery teams (picks 15-30)
  const nonLotteryResult = await pool.query(
    `SELECT t.id, t.name, t.abbreviation
     FROM standings s
     JOIN teams t ON s.team_id = t.id
     WHERE s.season_id = $1
       AND t.id NOT IN (SELECT team_id FROM draft_lottery WHERE season_id = $1)
     ORDER BY s.wins ASC, s.losses DESC`,
    [seasonId]
  );

  let pickNum = 15;
  for (const row of nonLotteryResult.rows) {
    order.push({
      pick: pickNum,
      round: 1,
      team_id: row.id,
      team_name: row.name,
      abbreviation: row.abbreviation,
      original_team_id: row.id,
      was_traded: false,
    });
    pickNum++;
  }

  // Second round (reverse order)
  const firstRound = [...order];
  for (let i = firstRound.length - 1; i >= 0; i--) {
    order.push({
      pick: 31 + (firstRound.length - 1 - i),
      round: 2,
      team_id: firstRound[i].team_id,
      team_name: firstRound[i].team_name,
      abbreviation: firstRound[i].abbreviation,
      original_team_id: firstRound[i].original_team_id,
      was_traded: false,
    });
  }

  return order;
}
