// Trade Evaluation System
// Based on GAME_DESIGN.md Section 9.3

export interface TradeAsset {
  asset_type: 'player' | 'draft_pick' | 'cash';
  from_team_id: string;
  to_team_id: string;

  // For players
  player_id?: string;
  player_overall?: number;
  player_potential?: number;
  player_age?: number;
  player_salary?: number;

  // For draft picks
  pick_year?: number;
  pick_round?: number;
  pick_original_team_id?: string;
  is_pick_swap?: boolean;

  // For cash
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

// Salary matching rules (GAME_DESIGN.md Section 9.1)
const SALARY_MATCHING = {
  over_cap_percentage: 1.25,     // 125%
  over_cap_flat: 100_000,        // + $100K
};

// Trade restrictions
const TRADE_RESTRICTIONS = {
  newly_signed_days: 60,         // Can't trade within 60 days of signing
  retrade_days: 30               // Can't trade same player twice in 30 days
};

// Calculate player trade value
export function calculatePlayerValue(
  overall: number,
  potential: number,
  age: number,
  salary: number,
  forContender: boolean
): number {
  let value = 0;

  // Base value from overall (0-99 scale -> 0-150 value)
  value += overall * 1.5;

  // Age factor (younger = more valuable, prime is 25-30)
  if (age < 25) {
    // Young with potential - high value if good potential
    value += Math.max(0, 30 - age) * 2;
    value += potential * 0.5;
  } else if (age <= 30) {
    // Prime years
    value += 10;
  } else {
    // Declining - reduce value
    value -= (age - 30) * 3;
  }

  // Contract value (good contracts more valuable)
  // Positive if underpaid, negative if overpaid
  const expectedSalary = (overall / 100) * 30_000_000; // Rough expected salary
  const salaryValue = (expectedSalary - salary) / 1_000_000;
  value += salaryValue * 2;

  // Contender/rebuild adjustments
  if (forContender) {
    // Contenders value veterans and proven players more
    if (age >= 28 && overall >= 75) {
      value *= 1.2;
    }
    // Contenders value picks less
  } else {
    // Rebuilding teams value youth and potential more
    if (age <= 24 && potential >= 80) {
      value *= 1.3;
    }
  }

  return Math.round(value);
}

// Estimate draft pick value
export function estimatePickValue(
  year: number,
  round: number,
  originalTeamWins: number,
  currentYear: number,
  isContender: boolean
): number {
  let value = 0;

  // Base value by round
  if (round === 1) {
    value = 40;  // First rounders more valuable
  } else {
    value = 15;  // Second rounders
  }

  // Adjust by expected pick position (based on team's wins)
  // Fewer wins = better pick
  const expectedPosition = Math.max(1, Math.min(30, Math.round(originalTeamWins / 2.73)));
  if (round === 1) {
    // Lottery picks much more valuable
    if (expectedPosition <= 4) {
      value += 50;
    } else if (expectedPosition <= 14) {
      value += 30;
    } else {
      value += 20 - expectedPosition / 2;
    }
  }

  // Future picks are discounted
  const yearsAway = year - currentYear;
  if (yearsAway > 0) {
    value *= Math.pow(0.9, yearsAway);  // 10% discount per year
  }

  // Rebuilding teams value picks more
  if (!isContender) {
    value *= 1.2;
  }

  return Math.round(value);
}

// Validate a trade proposal
export function validateTrade(
  proposal: TradeProposal,
  teams: Map<string, TeamTradeContext>,
  players: Map<string, {
    salary: number;
    signed_date?: Date;
    last_traded_at?: Date;
    no_trade_clause?: boolean;
  }>
): TradeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Group assets by team
  const teamAssets = new Map<string, { incoming: TradeAsset[]; outgoing: TradeAsset[] }>();
  for (const teamId of proposal.teams) {
    teamAssets.set(teamId, { incoming: [], outgoing: [] });
  }

  for (const asset of proposal.assets) {
    const from = teamAssets.get(asset.from_team_id);
    const to = teamAssets.get(asset.to_team_id);
    if (from) from.outgoing.push(asset);
    if (to) to.incoming.push(asset);
  }

  // 1. Check salary matching for each team
  for (const [teamId, assets] of teamAssets) {
    const team = teams.get(teamId);
    if (!team) continue;

    const outgoingSalary = assets.outgoing
      .filter(a => a.asset_type === 'player')
      .reduce((sum, a) => sum + (a.player_salary || 0), 0);

    const incomingSalary = assets.incoming
      .filter(a => a.asset_type === 'player')
      .reduce((sum, a) => sum + (a.player_salary || 0), 0);

    const isOverCap = team.cap_space <= 0;

    if (isOverCap) {
      // Must match within 125% + $100K
      const maxIncoming = outgoingSalary * SALARY_MATCHING.over_cap_percentage + SALARY_MATCHING.over_cap_flat;
      if (incomingSalary > maxIncoming) {
        errors.push(`${team.team_name}: Incoming salary ($${(incomingSalary / 1_000_000).toFixed(1)}M) exceeds 125% + $100K of outgoing ($${(outgoingSalary / 1_000_000).toFixed(1)}M)`);
      }
    } else {
      // Can absorb into cap space
      const availableSpace = team.cap_space + outgoingSalary;
      if (incomingSalary > availableSpace) {
        errors.push(`${team.team_name}: Insufficient cap space to absorb incoming salary`);
      }
    }
  }

  // 2. Check player restrictions
  for (const asset of proposal.assets) {
    if (asset.asset_type !== 'player' || !asset.player_id) continue;

    const player = players.get(asset.player_id);
    if (!player) continue;

    // Check newly signed restriction
    if (player.signed_date) {
      const daysSinceSigned = Math.floor((Date.now() - player.signed_date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceSigned < TRADE_RESTRICTIONS.newly_signed_days) {
        errors.push(`Player cannot be traded within ${TRADE_RESTRICTIONS.newly_signed_days} days of signing (${TRADE_RESTRICTIONS.newly_signed_days - daysSinceSigned} days remaining)`);
      }
    }

    // Check retrade restriction
    if (player.last_traded_at) {
      const daysSinceTraded = Math.floor((Date.now() - player.last_traded_at.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceTraded < TRADE_RESTRICTIONS.retrade_days) {
        warnings.push(`Player was recently traded (${TRADE_RESTRICTIONS.retrade_days - daysSinceTraded} days until tradeable)`);
      }
    }

    // Check no-trade clause
    if (player.no_trade_clause) {
      warnings.push(`Player has no-trade clause - needs approval`);
    }
  }

  // 3. Check roster sizes
  for (const [teamId, assets] of teamAssets) {
    const team = teams.get(teamId);
    if (!team) continue;

    const outCount = assets.outgoing.filter(a => a.asset_type === 'player').length;
    const inCount = assets.incoming.filter(a => a.asset_type === 'player').length;
    const newSize = team.roster_size - outCount + inCount;

    if (newSize > 15) {
      errors.push(`${team.team_name}: Would exceed 15-man roster (${newSize} players)`);
    }
    if (newSize < 12) {
      errors.push(`${team.team_name}: Would fall below 12-man minimum (${newSize} players)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Evaluate trade from a team's perspective (for CPU AI)
export function evaluateTradeForTeam(
  teamId: string,
  proposal: TradeProposal,
  teamContext: TeamTradeContext,
  currentYear: number
): TradeEvaluation {
  let value = 0;
  const reasoning: string[] = [];

  // Find this team's assets
  const incoming = proposal.assets.filter(a => a.to_team_id === teamId);
  const outgoing = proposal.assets.filter(a => a.from_team_id === teamId);

  // Evaluate incoming players
  for (const asset of incoming) {
    if (asset.asset_type === 'player' && asset.player_overall) {
      const playerValue = calculatePlayerValue(
        asset.player_overall,
        asset.player_potential || asset.player_overall,
        asset.player_age || 27,
        asset.player_salary || 0,
        teamContext.is_contender
      );
      value += playerValue;
      reasoning.push(`+${playerValue}: Acquiring player (OVR ${asset.player_overall})`);
    } else if (asset.asset_type === 'draft_pick' && asset.pick_year && asset.pick_round) {
      const pickValue = estimatePickValue(
        asset.pick_year,
        asset.pick_round,
        41,  // Assume average team
        currentYear,
        teamContext.is_contender
      );
      value += pickValue;
      reasoning.push(`+${pickValue}: Acquiring ${asset.pick_year} Round ${asset.pick_round} pick`);
    } else if (asset.asset_type === 'cash' && asset.cash_amount) {
      // Cash has minimal trade value
      value += asset.cash_amount / 1_000_000;
      reasoning.push(`+${Math.round(asset.cash_amount / 1_000_000)}: Cash consideration`);
    }
  }

  // Evaluate outgoing players (negative value)
  for (const asset of outgoing) {
    if (asset.asset_type === 'player' && asset.player_overall) {
      const playerValue = calculatePlayerValue(
        asset.player_overall,
        asset.player_potential || asset.player_overall,
        asset.player_age || 27,
        asset.player_salary || 0,
        teamContext.is_contender
      );
      value -= playerValue;
      reasoning.push(`-${playerValue}: Losing player (OVR ${asset.player_overall})`);
    } else if (asset.asset_type === 'draft_pick' && asset.pick_year && asset.pick_round) {
      const pickValue = estimatePickValue(
        asset.pick_year,
        asset.pick_round,
        teamContext.wins,
        currentYear,
        teamContext.is_contender
      );
      value -= pickValue;
      reasoning.push(`-${pickValue}: Losing ${asset.pick_year} Round ${asset.pick_round} pick`);
    }
  }

  // Positional need bonus
  const incomingPositions = incoming
    .filter(a => a.asset_type === 'player')
    .map(a => a.player_id); // Would need position info here

  // Make decision
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
    reasoning
  };
}

// Generate a counter offer
export function generateCounterOffer(
  originalProposal: TradeProposal,
  teamId: string,
  valueDelta: number
): Partial<TradeProposal> | null {
  // Would need access to team's draft picks and players to suggest additions
  // For now, return null (decline to counter)
  return null;
}
