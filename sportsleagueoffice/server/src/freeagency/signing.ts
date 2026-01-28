import { ContractOffer, calculateMarketValue, canAffordContract } from './contracts.js';

export interface FreeAgent {
  player_id: string;
  player_name: string;
  overall: number;
  potential: number;
  age: number;
  position: string;
  years_pro: number;
  fa_type: 'unrestricted' | 'restricted';
  rights_team_id?: string;
  money_priority: number;
  winning_priority: number;
  role_priority: number;
  market_size_priority: number;
  asking_salary: number;
  market_value: number;
  offers: ContractOffer[];
  status: 'available' | 'negotiating' | 'signed' | 'withdrawn';
}

export interface OfferScore {
  total: number;
  money_score: number;
  winning_score: number;
  role_score: number;
  market_score: number;
}

export interface TeamContext {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  market_size: 'large' | 'medium' | 'small';
  roster_size: number;
  needs_position: boolean;
  star_count: number;
}

export interface OfferValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function generateFAPreferences(player: {
  greed: number;
  ego: number;
  loyalty: number;
  age: number;
  overall: number;
}): { money: number; winning: number; role: number; market: number } {
  const randomOffset = () => Math.random() * 20 - 10;
  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const ageBonus = player.age > 32 ? 20 : player.age > 30 ? 10 : 0;
  const starBonus = player.overall > 85 ? 20 : player.overall > 80 ? 10 : 0;

  return {
    money: Math.round(clamp(player.greed + randomOffset(), 20, 100)),
    winning: Math.round(clamp(50 + ageBonus + randomOffset(), 20, 100)),
    role: Math.round(clamp(player.ego * 0.7 + 30 + randomOffset(), 20, 100)),
    market: Math.round(clamp(30 + starBonus + randomOffset(), 10, 100))
  };
}

export function calculateAskingSalary(marketValue: number, greed: number): number {
  const greedMultiplier = 0.9 + (greed / 100) * 0.3;
  return Math.round((marketValue * greedMultiplier) / 100_000) * 100_000;
}

function calculateMoneyScore(offerSalary: number, askingSalary: number, years: number): number {
  let score: number;

  if (offerSalary >= askingSalary) {
    score = 100;
  } else if (offerSalary >= askingSalary * 0.9) {
    score = 80 + ((offerSalary - askingSalary * 0.9) / (askingSalary * 0.1)) * 20;
  } else if (offerSalary >= askingSalary * 0.75) {
    score = 50 + ((offerSalary - askingSalary * 0.75) / (askingSalary * 0.15)) * 30;
  } else {
    score = (offerSalary / (askingSalary * 0.75)) * 50;
  }

  return score + years * 3;
}

function calculateRoleScore(overall: number, starCount: number, needsPosition: boolean, rosterSize: number): number {
  if (overall >= 85 && starCount <= 1) return 100;
  if (overall >= 80 && starCount <= 2) return 80;
  if (needsPosition) return 70;
  if (rosterSize < 12) return 60;
  return 40;
}

function calculateMarketScore(marketSize: 'large' | 'medium' | 'small'): number {
  if (marketSize === 'large') return 100;
  if (marketSize === 'medium') return 65;
  return 35;
}

export function scoreOffer(fa: FreeAgent, offer: ContractOffer, team: TeamContext): OfferScore {
  const totalPriority = fa.money_priority + fa.winning_priority + fa.role_priority + fa.market_size_priority;
  const moneyWeight = fa.money_priority / totalPriority;
  const winningWeight = fa.winning_priority / totalPriority;
  const roleWeight = fa.role_priority / totalPriority;
  const marketWeight = fa.market_size_priority / totalPriority;

  const money_score = calculateMoneyScore(offer.salary_per_year, fa.asking_salary, offer.years);
  const winPct = team.wins / (team.wins + team.losses + 0.001);
  const winning_score = Math.min(100, winPct * 100 + team.star_count * 5);
  const role_score = calculateRoleScore(fa.overall, team.star_count, team.needs_position, team.roster_size);
  const market_score = calculateMarketScore(team.market_size);

  const total = money_score * moneyWeight +
    winning_score * winningWeight +
    role_score * roleWeight +
    market_score * marketWeight;

  return {
    total: Math.round(total),
    money_score: Math.round(money_score),
    winning_score: Math.round(winning_score),
    role_score: Math.round(role_score),
    market_score: Math.round(market_score)
  };
}

export function evaluateOffers(
  fa: FreeAgent,
  offers: Array<{ offer: ContractOffer; team: TeamContext }>
): { acceptedOffer: ContractOffer | null; scores: Map<string, OfferScore> } {
  if (offers.length === 0) {
    return { acceptedOffer: null, scores: new Map() };
  }

  const scores = new Map<string, OfferScore>();
  let bestOffer: ContractOffer | null = null;
  let bestScore = 0;

  for (const { offer, team } of offers) {
    const score = scoreOffer(fa, offer, team);
    scores.set(team.team_id, score);

    if (score.total > bestScore) {
      bestScore = score.total;
      bestOffer = offer;
    }
  }

  const acceptThreshold = 50 + (fa.overall - 70);
  if (bestScore < acceptThreshold) {
    return { acceptedOffer: null, scores };
  }

  return { acceptedOffer: bestOffer, scores };
}

export function canMatchOffer(
  rightsTeam: { payroll: number; cap_space: number },
  offer: ContractOffer
): boolean {
  return canAffordContract(rightsTeam.payroll, offer.salary_per_year).canSign;
}

export function validateOffer(
  team: { payroll: number; roster_size: number },
  offer: ContractOffer,
  fa: FreeAgent
): OfferValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (team.roster_size >= 15) {
    errors.push('Roster is full (15 players max)');
  }

  const affordability = canAffordContract(team.payroll, offer.salary_per_year);
  if (!affordability.canSign) {
    errors.push('Cannot afford this contract');
  }

  if (offer.years < 1 || offer.years > 5) {
    errors.push('Contract must be 1-5 years');
  }

  if (offer.salary_per_year < fa.market_value * 0.5) {
    warnings.push('Offer significantly below market value - unlikely to be accepted');
  }

  if (offer.salary_per_year > fa.market_value * 1.5) {
    warnings.push('Offer significantly above market value');
  }

  if (affordability.taxImplication > 0) {
    warnings.push(`This signing will incur $${(affordability.taxImplication / 1_000_000).toFixed(1)}M in luxury tax`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function calculateContractYears(age: number): number {
  if (age <= 27) return Math.min(4, Math.floor(Math.random() * 3) + 2);
  if (age <= 32) return Math.min(3, Math.floor(Math.random() * 2) + 2);
  return Math.floor(Math.random() * 2) + 1;
}

function calculateTeamNeedScore(team: TeamContext): number {
  return (team.needs_position ? 30 : 0) + (15 - team.roster_size) * 2 + (82 - team.wins) / 2;
}

export function generateCPUOffers(
  fa: FreeAgent,
  interestedTeams: TeamContext[],
  maxOffers: number = 3
): Array<{ offer: ContractOffer; team: TeamContext }> {
  const sortedTeams = [...interestedTeams].sort((a, b) => calculateTeamNeedScore(b) - calculateTeamNeedScore(a));

  return sortedTeams.slice(0, maxOffers).map(team => {
    const needMultiplier = team.needs_position ? 1.1 : 0.95;
    const offerSalary = Math.round(fa.market_value * needMultiplier);
    const years = calculateContractYears(fa.age);

    return {
      offer: {
        team_id: team.team_id,
        player_id: fa.player_id,
        years,
        salary_per_year: Math.round(offerSalary / 100_000) * 100_000,
        total_value: offerSalary * years
      },
      team
    };
  });
}
