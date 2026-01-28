import { pool } from '../db/pool';

export interface TeamNeed {
  position: string;
  need_score: number;
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

interface DraftOrderPick {
  pick: number;
  round: number;
  team_id: string;
  team_name: string;
  abbreviation: string;
  original_team_id: string;
  was_traded: boolean;
}

const POSITION_GROUPS: Record<string, string[]> = {
  PG: ['PG'],
  SG: ['SG', 'PG'],
  SF: ['SF', 'SG'],
  PF: ['PF', 'SF'],
  C: ['C', 'PF'],
};

function calculateNeedScore(starterOverall: number, depth: number): number {
  if (depth === 0) {
    return 100;
  }
  if (starterOverall < 65) {
    return 90 - starterOverall;
  }
  if (starterOverall < 75) {
    return 85 - starterOverall;
  }
  if (depth < 2) {
    return 30;
  }
  return Math.max(0, 20 - (starterOverall - 75));
}

export async function evaluateTeamNeeds(teamId: string): Promise<TeamNeed[]> {
  const rosterResult = await pool.query(
    `SELECT p.position, p.overall, p.id
     FROM players p
     WHERE p.team_id = $1
     ORDER BY p.overall DESC`,
    [teamId]
  );

  const roster = rosterResult.rows;
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];

  return positions.map(pos => {
    const eligiblePlayers = roster.filter((p: any) =>
      POSITION_GROUPS[pos]?.includes(p.position)
    );
    const starterOverall = eligiblePlayers[0]?.overall || 0;
    const depth = eligiblePlayers.length;
    const needScore = calculateNeedScore(starterOverall, depth);

    return {
      position: pos,
      need_score: Math.max(0, Math.min(100, needScore)),
      starter_overall: starterOverall,
      depth,
    };
  });
}

export function calculateBPAScore(overall: number, potential: number, mockPosition: number): number {
  const overallScore = overall * 0.6;
  const potentialScore = potential * 0.3;
  const mockScore = Math.max(0, (60 - mockPosition)) * 0.1;
  return overallScore + potentialScore + mockScore;
}

export async function evaluateProspects(
  teamId: string,
  seasonId: string
): Promise<ProspectEvaluation[]> {
  const needs = await evaluateTeamNeeds(teamId);
  const needsMap = new Map(needs.map(n => [n.position, n.need_score]));

  const prospectsResult = await pool.query(
    `SELECT id, first_name, last_name, position, overall, potential, mock_draft_position
     FROM draft_prospects
     WHERE season_id = $1 AND is_drafted = false
     ORDER BY mock_draft_position`,
    [seasonId]
  );

  const evaluations: ProspectEvaluation[] = prospectsResult.rows.map((prospect: any) => {
    const bpaScore = calculateBPAScore(
      prospect.overall,
      prospect.potential,
      prospect.mock_draft_position
    );
    const needScore = needsMap.get(prospect.position) || 50;
    const totalScore = bpaScore * 0.7 + needScore * 0.3;

    return {
      prospect_id: prospect.id,
      first_name: prospect.first_name,
      last_name: prospect.last_name,
      position: prospect.position,
      overall: prospect.overall,
      potential: prospect.potential,
      bpa_score: bpaScore,
      need_score: needScore,
      total_score: totalScore,
    };
  });

  return evaluations.sort((a, b) => b.total_score - a.total_score);
}

export async function selectAIPick(teamId: string, seasonId: string): Promise<ProspectEvaluation | null> {
  const evaluations = await evaluateProspects(teamId, seasonId);

  if (evaluations.length === 0) {
    return null;
  }

  const rand = Math.random();
  const pickIndex = getRandomizedPickIndex(rand, evaluations.length);
  return evaluations[pickIndex];
}

function getRandomizedPickIndex(rand: number, availableCount: number): number {
  if (rand < 0.8 || availableCount === 1) {
    return 0;
  }
  if (rand < 0.95 || availableCount === 2) {
    return 1;
  }
  return Math.min(2, availableCount - 1);
}

export async function getDraftState(seasonId: string) {
  const picksResult = await pool.query(
    `SELECT COUNT(*) as picks_made FROM draft_prospects WHERE season_id = $1 AND is_drafted = true`,
    [seasonId]
  );
  const picksMade = parseInt(picksResult.rows[0].picks_made);
  const currentPick = picksMade + 1;
  const currentRound = currentPick <= 30 ? 1 : 2;

  return {
    picks_made: picksMade,
    current_pick: currentPick,
    current_round: currentRound,
    pick_in_round: currentRound === 1 ? currentPick : currentPick - 30,
    is_draft_complete: picksMade >= 60,
  };
}

export async function getTeamAtPick(seasonId: string, pickNumber: number): Promise<string | null> {
  const round = pickNumber <= 30 ? 1 : 2;
  const pickInRound = round === 1 ? pickNumber : pickNumber - 30;

  if (round === 2) {
    const firstRoundPick = 31 - pickInRound;
    return getTeamAtPick(seasonId, firstRoundPick);
  }

  if (pickInRound <= 14) {
    const result = await pool.query(
      `SELECT team_id FROM draft_lottery
       WHERE season_id = $1 AND post_lottery_position = $2`,
      [seasonId, pickInRound]
    );
    return result.rows[0]?.team_id || null;
  }

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

export async function buildDraftOrder(seasonId: string): Promise<DraftOrderPick[]> {
  const picksResult = await pool.query(
    `SELECT dp.pick_number, dp.round, dp.current_team_id, dp.original_team_id, dp.was_traded,
            t.name, t.abbreviation
     FROM draft_picks dp
     JOIN teams t ON dp.current_team_id = t.id
     WHERE dp.season_id = $1
     ORDER BY dp.pick_number`,
    [seasonId]
  );

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

  return buildFallbackDraftOrder(seasonId);
}

async function buildFallbackDraftOrder(seasonId: string): Promise<DraftOrderPick[]> {
  const order: DraftOrderPick[] = [];

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
