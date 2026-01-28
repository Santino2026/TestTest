export interface TradeAsset {
  asset_type: 'player' | 'draft_pick' | 'cash';
  from_team_id: string;
  to_team_id: string;
  player_id?: string;
  player_overall?: number;
  player_potential?: number;
  player_age?: number;
  player_salary?: number;
  pick_year?: number;
  pick_round?: number;
  pick_original_team_id?: string;
  is_pick_swap?: boolean;
  cash_amount?: number;
}

export interface TradeProposal {
  id: string;
  teams: string[];
  assets: TradeAsset[];
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'cancelled';
  proposed_by: string;
}

export interface TeamTradeContext {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  payroll: number;
  cap_space: number;
  roster_size: number;
  is_contender: boolean;
  is_rebuilding: boolean;
  positional_needs: string[];
}

export interface TradeValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TradeEvaluation {
  team_id: string;
  value_score: number;
  recommendation: 'accept' | 'reject' | 'counter';
  reasoning: string[];
}

interface PlayerRestrictions {
  salary: number;
  signed_date?: Date;
  last_traded_at?: Date;
  no_trade_clause?: boolean;
}

const SALARY_MATCHING = {
  over_cap_percentage: 1.25,
  over_cap_flat: 100_000,
};

const TRADE_RESTRICTIONS = {
  newly_signed_days: 60,
  retrade_days: 30,
};

function calculateAgeFactor(age: number, potential: number): number {
  if (age < 25) {
    return Math.max(0, 30 - age) * 2 + potential * 0.5;
  }
  if (age <= 30) {
    return 10;
  }
  return -(age - 30) * 3;
}

function calculateSalaryValue(overall: number, salary: number): number {
  const expectedSalary = (overall / 100) * 30_000_000;
  return ((expectedSalary - salary) / 1_000_000) * 2;
}

export function calculatePlayerValue(
  overall: number,
  potential: number,
  age: number,
  salary: number,
  forContender: boolean
): number {
  let value = overall * 1.5;
  value += calculateAgeFactor(age, potential);
  value += calculateSalaryValue(overall, salary);

  if (forContender && age >= 28 && overall >= 75) {
    value *= 1.2;
  } else if (!forContender && age <= 24 && potential >= 80) {
    value *= 1.3;
  }

  return Math.round(value);
}

export function estimatePickValue(
  year: number,
  round: number,
  originalTeamWins: number,
  currentYear: number,
  isContender: boolean
): number {
  const baseValue = round === 1 ? 40 : 15;
  let value = baseValue;

  if (round === 1) {
    const expectedPosition = Math.max(1, Math.min(30, Math.round(originalTeamWins / 2.73)));
    if (expectedPosition <= 4) {
      value += 50;
    } else if (expectedPosition <= 14) {
      value += 30;
    } else {
      value += 20 - expectedPosition / 2;
    }
  }

  const yearsAway = year - currentYear;
  if (yearsAway > 0) {
    value *= Math.pow(0.9, yearsAway);
  }

  if (!isContender) {
    value *= 1.2;
  }

  return Math.round(value);
}

function groupAssetsByTeam(
  proposal: TradeProposal
): Map<string, { incoming: TradeAsset[]; outgoing: TradeAsset[] }> {
  const teamAssets = new Map<string, { incoming: TradeAsset[]; outgoing: TradeAsset[] }>();

  for (const teamId of proposal.teams) {
    teamAssets.set(teamId, { incoming: [], outgoing: [] });
  }

  for (const asset of proposal.assets) {
    teamAssets.get(asset.from_team_id)?.outgoing.push(asset);
    teamAssets.get(asset.to_team_id)?.incoming.push(asset);
  }

  return teamAssets;
}

function calculateTotalSalary(assets: TradeAsset[]): number {
  return assets
    .filter(a => a.asset_type === 'player')
    .reduce((sum, a) => sum + (a.player_salary || 0), 0);
}

function validateSalaryMatching(
  team: TeamTradeContext,
  incomingSalary: number,
  outgoingSalary: number
): string | null {
  const isOverCap = team.cap_space <= 0;

  if (isOverCap) {
    const maxIncoming = outgoingSalary * SALARY_MATCHING.over_cap_percentage + SALARY_MATCHING.over_cap_flat;
    if (incomingSalary > maxIncoming) {
      return `${team.team_name}: Incoming salary ($${(incomingSalary / 1_000_000).toFixed(1)}M) exceeds 125% + $100K of outgoing ($${(outgoingSalary / 1_000_000).toFixed(1)}M)`;
    }
  } else {
    const availableSpace = team.cap_space + outgoingSalary;
    if (incomingSalary > availableSpace) {
      return `${team.team_name}: Insufficient cap space to absorb incoming salary`;
    }
  }

  return null;
}

function validatePlayerRestrictions(
  asset: TradeAsset,
  players: Map<string, PlayerRestrictions>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (asset.asset_type !== 'player' || !asset.player_id) {
    return { errors, warnings };
  }

  const player = players.get(asset.player_id);
  if (!player) {
    return { errors, warnings };
  }

  if (player.signed_date) {
    const daysSinceSigned = Math.floor((Date.now() - player.signed_date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceSigned < TRADE_RESTRICTIONS.newly_signed_days) {
      const daysRemaining = TRADE_RESTRICTIONS.newly_signed_days - daysSinceSigned;
      errors.push(`Player cannot be traded within ${TRADE_RESTRICTIONS.newly_signed_days} days of signing (${daysRemaining} days remaining)`);
    }
  }

  if (player.last_traded_at) {
    const daysSinceTraded = Math.floor((Date.now() - player.last_traded_at.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceTraded < TRADE_RESTRICTIONS.retrade_days) {
      const daysRemaining = TRADE_RESTRICTIONS.retrade_days - daysSinceTraded;
      warnings.push(`Player was recently traded (${daysRemaining} days until tradeable)`);
    }
  }

  if (player.no_trade_clause) {
    warnings.push('Player has no-trade clause - needs approval');
  }

  return { errors, warnings };
}

function validateRosterSize(
  team: TeamTradeContext,
  outgoingCount: number,
  incomingCount: number
): string | null {
  const newSize = team.roster_size - outgoingCount + incomingCount;

  if (newSize > 15) {
    return `${team.team_name}: Would exceed 15-man roster (${newSize} players)`;
  }
  if (newSize < 12) {
    return `${team.team_name}: Would fall below 12-man minimum (${newSize} players)`;
  }

  return null;
}

export function validateTrade(
  proposal: TradeProposal,
  teams: Map<string, TeamTradeContext>,
  players: Map<string, PlayerRestrictions>
): TradeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const teamAssets = groupAssetsByTeam(proposal);

  for (const [teamId, assets] of teamAssets) {
    const team = teams.get(teamId);
    if (!team) continue;

    const outgoingSalary = calculateTotalSalary(assets.outgoing);
    const incomingSalary = calculateTotalSalary(assets.incoming);
    const salaryError = validateSalaryMatching(team, incomingSalary, outgoingSalary);
    if (salaryError) {
      errors.push(salaryError);
    }

    const outCount = assets.outgoing.filter(a => a.asset_type === 'player').length;
    const inCount = assets.incoming.filter(a => a.asset_type === 'player').length;
    const rosterError = validateRosterSize(team, outCount, inCount);
    if (rosterError) {
      errors.push(rosterError);
    }
  }

  for (const asset of proposal.assets) {
    const restrictions = validatePlayerRestrictions(asset, players);
    errors.push(...restrictions.errors);
    warnings.push(...restrictions.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function evaluateAssetValue(
  asset: TradeAsset,
  isContender: boolean,
  teamWins: number,
  currentYear: number
): { value: number; description: string } | null {
  if (asset.asset_type === 'player' && asset.player_overall) {
    const value = calculatePlayerValue(
      asset.player_overall,
      asset.player_potential || asset.player_overall,
      asset.player_age || 27,
      asset.player_salary || 0,
      isContender
    );
    return { value, description: `player (OVR ${asset.player_overall})` };
  }

  if (asset.asset_type === 'draft_pick' && asset.pick_year && asset.pick_round) {
    const value = estimatePickValue(
      asset.pick_year,
      asset.pick_round,
      teamWins,
      currentYear,
      isContender
    );
    return { value, description: `${asset.pick_year} Round ${asset.pick_round} pick` };
  }

  if (asset.asset_type === 'cash' && asset.cash_amount) {
    const value = Math.round(asset.cash_amount / 1_000_000);
    return { value, description: 'Cash consideration' };
  }

  return null;
}

export function evaluateTradeForTeam(
  teamId: string,
  proposal: TradeProposal,
  teamContext: TeamTradeContext,
  currentYear: number
): TradeEvaluation {
  let value = 0;
  const reasoning: string[] = [];

  const incoming = proposal.assets.filter(a => a.to_team_id === teamId);
  const outgoing = proposal.assets.filter(a => a.from_team_id === teamId);

  for (const asset of incoming) {
    const evaluation = evaluateAssetValue(asset, teamContext.is_contender, 41, currentYear);
    if (evaluation) {
      value += evaluation.value;
      reasoning.push(`+${evaluation.value}: Acquiring ${evaluation.description}`);
    }
  }

  for (const asset of outgoing) {
    const evaluation = evaluateAssetValue(asset, teamContext.is_contender, teamContext.wins, currentYear);
    if (evaluation) {
      value -= evaluation.value;
      reasoning.push(`-${evaluation.value}: Losing ${evaluation.description}`);
    }
  }

  let recommendation: 'accept' | 'reject' | 'counter';
  if (value > 10) {
    recommendation = 'accept';
    reasoning.push('Trade favors us significantly');
  } else if (value > -5) {
    recommendation = 'counter';
    reasoning.push('Trade is roughly even - may counter for better terms');
  } else {
    recommendation = 'reject';
    reasoning.push('Trade does not favor us');
  }

  return {
    team_id: teamId,
    value_score: Math.round(value),
    recommendation,
    reasoning,
  };
}
