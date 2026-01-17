export type TeamStrategy = 'contending' | 'rebuilding' | 'retooling' | 'competing';

export interface CPUTeamContext {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  win_pct: number;
  payroll: number;
  cap_space: number;
  roster_size: number;
  avg_age: number;
  avg_overall: number;
  star_count: number;
  young_talent: number;
  championship_window: boolean;
  positional_needs: string[];
}

export interface AIDecision {
  type: 'trade' | 'signing' | 'release' | 'draft' | 'lineup';
  priority: number;
  reasoning: string[];
  details: any;
}

export function determineTeamStrategy(context: CPUTeamContext): TeamStrategy {
  const { win_pct, avg_age, star_count, young_talent, championship_window } = context;

  if (win_pct >= 0.6 && star_count >= 2 && championship_window) {
    return 'contending';
  }

  if (win_pct < 0.35 && avg_age < 26 && young_talent >= 3) {
    return 'rebuilding';
  }

  if (win_pct >= 0.35 && win_pct < 0.55) {
    if (young_talent >= 2 && star_count < 2) {
      return 'retooling';
    }
    return 'competing';
  }

  return 'competing';
}

export function analyzePositionalNeeds(roster: Array<{
  position: string;
  overall: number;
  age: number;
}>): string[] {
  const needs: string[] = [];

  const positionStats: Record<string, { count: number; avgOvr: number; starters: number }> = {
    PG: { count: 0, avgOvr: 0, starters: 0 },
    SG: { count: 0, avgOvr: 0, starters: 0 },
    SF: { count: 0, avgOvr: 0, starters: 0 },
    PF: { count: 0, avgOvr: 0, starters: 0 },
    C: { count: 0, avgOvr: 0, starters: 0 }
  };

  for (const player of roster) {
    const pos = player.position;
    if (positionStats[pos]) {
      positionStats[pos].count++;
      positionStats[pos].avgOvr += player.overall;
      if (player.overall >= 75) positionStats[pos].starters++;
    }
  }

  for (const pos of Object.keys(positionStats)) {
    if (positionStats[pos].count > 0) {
      positionStats[pos].avgOvr /= positionStats[pos].count;
    }
  }

  for (const [pos, stats] of Object.entries(positionStats)) {
    if (stats.starters === 0) {
      needs.push(pos);
    } else if (stats.count < 2) {
      needs.push(`${pos}_depth`);
    }
  }

  return needs;
}

function getPlayerValueModifier(strategy: TeamStrategy): number {
  if (strategy === 'contending') return 1.3;
  if (strategy === 'rebuilding') return 0.7;
  return 1.0;
}

function getPickValueModifier(strategy: TeamStrategy): number {
  if (strategy === 'rebuilding') return 1.5;
  if (strategy === 'contending') return 0.6;
  return 1.0;
}

function getAcceptThreshold(strategy: TeamStrategy): number {
  if (strategy === 'contending') return 5;
  if (strategy === 'rebuilding') return 10;
  return 8;
}

export function evaluateIncomingTrade(
  context: CPUTeamContext,
  incoming: Array<{ overall: number; age: number; potential: number; salary: number }>,
  outgoing: Array<{ overall: number; age: number; potential: number; salary: number }>,
  incomingPicks: Array<{ year: number; round: number; expectedValue: number }>,
  outgoingPicks: Array<{ year: number; round: number; expectedValue: number }>
): { accept: boolean; score: number; reasoning: string[] } {
  const strategy = determineTeamStrategy(context);
  const reasoning: string[] = [];
  let score = 0;

  const playerValueMod = getPlayerValueModifier(strategy);

  for (const player of incoming) {
    let value = player.overall * 1.5;

    if (strategy === 'contending' && player.age > 30 && player.overall >= 80) {
      value *= 1.2;
    } else if (strategy === 'rebuilding' && player.age < 25) {
      value *= 1.3;
      value += player.potential * 0.5;
    }

    score += value * playerValueMod;
  }

  for (const player of outgoing) {
    let value = player.overall * 1.5;

    if (strategy === 'rebuilding' && player.age < 25) {
      value *= 1.3;
    }

    score -= value * playerValueMod;
  }

  const pickValueMod = getPickValueModifier(strategy);

  for (const pick of incomingPicks) {
    score += pick.expectedValue * pickValueMod;
    reasoning.push(`+${Math.round(pick.expectedValue * pickValueMod)}: ${pick.year} Round ${pick.round} pick`);
  }

  for (const pick of outgoingPicks) {
    score -= pick.expectedValue * pickValueMod;
    reasoning.push(`-${Math.round(pick.expectedValue * pickValueMod)}: Losing ${pick.year} Round ${pick.round} pick`);
  }

  const incomingSalary = incoming.reduce((sum, p) => sum + p.salary, 0);
  const outgoingSalary = outgoing.reduce((sum, p) => sum + p.salary, 0);
  const netSalary = incomingSalary - outgoingSalary;

  if (netSalary > 0 && context.cap_space < netSalary) {
    reasoning.push('Trade would put team over cap');
    score -= 20;
  }

  const acceptThreshold = getAcceptThreshold(strategy);

  return {
    accept: score >= acceptThreshold,
    score: Math.round(score),
    reasoning
  };
}

export function evaluateFreeAgentTarget(
  context: CPUTeamContext,
  freeAgent: {
    position: string;
    overall: number;
    age: number;
    potential: number;
    asking_salary: number;
  }
): { interested: boolean; maxOffer: number; reasoning: string[] } {
  const strategy = determineTeamStrategy(context);
  const reasoning: string[] = [];

  if (freeAgent.asking_salary > context.cap_space) {
    return { interested: false, maxOffer: 0, reasoning: ['Cannot afford asking salary'] };
  }

  if (context.roster_size >= 15) {
    return { interested: false, maxOffer: 0, reasoning: ['Roster is full'] };
  }

  const fillsNeed = context.positional_needs.includes(freeAgent.position);
  let interest = 50;

  if (strategy === 'contending') {
    if (freeAgent.overall >= 75 && freeAgent.age >= 27) {
      interest += 30;
      reasoning.push('Veteran who can help contend now');
    } else if (freeAgent.overall < 70) {
      interest -= 20;
      reasoning.push('Not good enough for a contender');
    }
  } else if (strategy === 'rebuilding') {
    if (freeAgent.age < 26 && freeAgent.potential >= 80) {
      interest += 40;
      reasoning.push('Young player with high potential');
    } else if (freeAgent.age >= 30) {
      interest -= 30;
      reasoning.push('Too old for a rebuilding team');
    }
  }

  if (fillsNeed) {
    interest += 20;
    reasoning.push(`Fills need at ${freeAgent.position}`);
  }

  const isGoodValue = freeAgent.asking_salary < freeAgent.overall * 300000;
  if (isGoodValue) {
    interest += 15;
    reasoning.push('Good value contract');
  }

  let maxOffer = freeAgent.asking_salary;

  if (interest >= 70 && fillsNeed) {
    maxOffer = Math.round(freeAgent.asking_salary * 1.1);
  } else if (interest < 50) {
    maxOffer = Math.round(freeAgent.asking_salary * 0.85);
  }

  maxOffer = Math.min(maxOffer, context.cap_space);

  return {
    interested: interest >= 50,
    maxOffer,
    reasoning
  };
}

export function selectDraftPick(
  context: CPUTeamContext,
  availableProspects: Array<{
    id: string;
    position: string;
    overall: number;
    potential: number;
    mock_draft_position: number;
    big_board_rank: number;
  }>,
  pickNumber: number
): { prospectId: string; reasoning: string[] } {
  const strategy = determineTeamStrategy(context);
  const reasoning: string[] = [];

  if (availableProspects.length === 0) {
    return { prospectId: '', reasoning: ['No prospects available'] };
  }

  const scoredProspects = availableProspects.map(prospect => {
    let score = prospect.overall + prospect.potential * 0.5;

    const valueOverSlot = prospect.mock_draft_position - pickNumber;
    if (valueOverSlot > 5) {
      score += 20;
    } else if (valueOverSlot > 0) {
      score += 10;
    }

    if (context.positional_needs.includes(prospect.position)) {
      score += 15;
    }

    if (strategy === 'contending') {
      score += prospect.overall * 0.3;
    } else if (strategy === 'rebuilding') {
      score += prospect.potential * 0.4;
    }

    return { prospect, score };
  });

  scoredProspects.sort((a, b) => b.score - a.score);

  const selected = scoredProspects[0];
  reasoning.push(`Selected ${selected.prospect.position} with ${selected.prospect.overall} OVR, ${selected.prospect.potential} POT`);
  if (context.positional_needs.includes(selected.prospect.position)) {
    reasoning.push(`Fills positional need at ${selected.prospect.position}`);
  }

  return {
    prospectId: selected.prospect.id,
    reasoning
  };
}

export function selectStarters(roster: Array<{
  id: string;
  position: string;
  overall: number;
  stamina: number;
  injury?: boolean;
}>): { starters: string[]; reasoning: string[] } {
  const reasoning: string[] = [];
  const available = roster.filter(p => !p.injury);

  const byPosition: Record<string, typeof available> = {
    PG: available.filter(p => p.position === 'PG'),
    SG: available.filter(p => p.position === 'SG'),
    SF: available.filter(p => p.position === 'SF'),
    PF: available.filter(p => p.position === 'PF'),
    C: available.filter(p => p.position === 'C')
  };

  for (const pos of Object.keys(byPosition)) {
    byPosition[pos].sort((a, b) => b.overall - a.overall);
  }

  const starters: string[] = [];
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];

  for (const pos of positions) {
    if (byPosition[pos].length > 0) {
      const starter = byPosition[pos][0];
      starters.push(starter.id);
      reasoning.push(`Starting ${pos}: ${starter.overall} OVR`);
    }
  }

  return { starters, reasoning };
}

export function generateCPUActions(
  context: CPUTeamContext,
  options: {
    canTrade: boolean;
    canSignFA: boolean;
    canDraft: boolean;
    freeAgents?: Array<any>;
    tradeOffers?: Array<any>;
  }
): AIDecision[] {
  const decisions: AIDecision[] = [];

  if (options.canTrade && options.tradeOffers && options.tradeOffers.length > 0) {
    for (const trade of options.tradeOffers) {
      const evaluation = evaluateIncomingTrade(
        context,
        trade.incoming || [],
        trade.outgoing || [],
        trade.incomingPicks || [],
        trade.outgoingPicks || []
      );

      if (evaluation.accept) {
        decisions.push({
          type: 'trade',
          priority: 8,
          reasoning: evaluation.reasoning,
          details: { trade_id: trade.id, action: 'accept' }
        });
      }
    }
  }

  if (options.canSignFA && options.freeAgents && context.roster_size < 15) {
    for (const fa of options.freeAgents.slice(0, 10)) {
      const evaluation = evaluateFreeAgentTarget(context, fa);

      if (evaluation.interested) {
        decisions.push({
          type: 'signing',
          priority: 6,
          reasoning: evaluation.reasoning,
          details: {
            player_id: fa.id,
            max_offer: evaluation.maxOffer
          }
        });
      }
    }
  }

  if (context.roster_size > 15) {
    decisions.push({
      type: 'release',
      priority: 10,
      reasoning: ['Roster over limit, must release player'],
      details: { target: 'lowest_overall' }
    });
  }

  return decisions.sort((a, b) => b.priority - a.priority);
}
