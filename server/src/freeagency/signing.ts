// Free Agent Signing System
// Based on GAME_DESIGN.md Section 8

import { ContractOffer, calculateMarketValue, canAffordContract } from './contracts';

export interface FreeAgent {
  player_id: string;
  player_name: string;
  overall: number;
  potential: number;
  age: number;
  position: string;
  years_pro: number;

  // FA type
  fa_type: 'unrestricted' | 'restricted';
  rights_team_id?: string;  // For RFA

  // Preferences (0-100)
  money_priority: number;
  winning_priority: number;
  role_priority: number;
  market_size_priority: number;

  // Market info
  asking_salary: number;
  market_value: number;

  // Current offers
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

// Team info needed for offer evaluation
export interface TeamContext {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  market_size: 'large' | 'medium' | 'small';
  roster_size: number;
  needs_position: boolean;
  star_count: number;  // Players over 80 OVR
}

function calculateAgeBonus(age: number): number {
  if (age > 32) return 20;
  if (age > 30) return 10;
  return 0;
}

function calculateStarBonus(overall: number): number {
  if (overall > 85) return 20;
  if (overall > 80) return 10;
  return 0;
}

// Generate free agent preferences based on hidden attributes
export function generateFAPreferences(player: {
  greed: number;
  ego: number;
  loyalty: number;
  age: number;
  overall: number;
}): { money: number; winning: number; role: number; market: number } {
  // Greed affects money priority
  const money = Math.min(100, Math.max(20, player.greed + Math.random() * 20 - 10));

  // Age affects winning priority (older players chase rings)
  const ageBonus = calculateAgeBonus(player.age);
  const winning = Math.min(100, Math.max(20, 50 + ageBonus + Math.random() * 20 - 10));

  // Ego affects role priority
  const role = Math.min(100, Math.max(20, player.ego * 0.7 + 30 + Math.random() * 20 - 10));

  // Stars care more about market size
  const starBonus = calculateStarBonus(player.overall);
  const market = Math.min(100, Math.max(10, 30 + starBonus + Math.random() * 20 - 10));

  return {
    money: Math.round(money),
    winning: Math.round(winning),
    role: Math.round(role),
    market: Math.round(market)
  };
}

// Calculate asking salary based on market value and greed
export function calculateAskingSalary(marketValue: number, greed: number): number {
  // High greed players ask for more
  const greedMultiplier = 0.9 + (greed / 100) * 0.3;  // 0.9x to 1.2x
  const asking = Math.round(marketValue * greedMultiplier);
  return Math.round(asking / 100_000) * 100_000;
}

// Score an offer from a player's perspective
export function scoreOffer(
  fa: FreeAgent,
  offer: ContractOffer,
  team: TeamContext
): OfferScore {
  // Normalize preferences to sum to 1
  const total = fa.money_priority + fa.winning_priority + fa.role_priority + fa.market_size_priority;
  const moneyWeight = fa.money_priority / total;
  const winningWeight = fa.winning_priority / total;
  const roleWeight = fa.role_priority / total;
  const marketWeight = fa.market_size_priority / total;

  // Money score (0-100): How close to asking price
  let money_score: number;
  if (offer.salary_per_year >= fa.asking_salary) {
    money_score = 100;
  } else if (offer.salary_per_year >= fa.asking_salary * 0.9) {
    money_score = 80 + (offer.salary_per_year - fa.asking_salary * 0.9) / (fa.asking_salary * 0.1) * 20;
  } else if (offer.salary_per_year >= fa.asking_salary * 0.75) {
    money_score = 50 + (offer.salary_per_year - fa.asking_salary * 0.75) / (fa.asking_salary * 0.15) * 30;
  } else {
    money_score = (offer.salary_per_year / (fa.asking_salary * 0.75)) * 50;
  }

  // Years bonus (longer = more security)
  money_score += offer.years * 3;

  // Winning score (0-100): Team's win percentage
  const winPct = team.wins / (team.wins + team.losses + 0.001);
  const winning_score = Math.min(100, winPct * 100 + team.star_count * 5);

  // Role score (0-100): Will they be a star on this team?
  let role_score: number;
  if (fa.overall >= 85 && team.star_count <= 1) {
    role_score = 100;  // Be the man
  } else if (fa.overall >= 80 && team.star_count <= 2) {
    role_score = 80;   // Be a star
  } else if (team.needs_position) {
    role_score = 70;   // Immediate starter
  } else if (team.roster_size < 12) {
    role_score = 60;   // Rotation player
  } else {
    role_score = 40;   // Bench role
  }

  // Market score (0-100): Market size preference
  const market_score = team.market_size === 'large' ? 100 :
                       team.market_size === 'medium' ? 65 : 35;

  // Calculate weighted total
  const total_score =
    money_score * moneyWeight +
    winning_score * winningWeight +
    role_score * roleWeight +
    market_score * marketWeight;

  return {
    total: Math.round(total_score),
    money_score: Math.round(money_score),
    winning_score: Math.round(winning_score),
    role_score: Math.round(role_score),
    market_score: Math.round(market_score)
  };
}

// Evaluate all offers and decide which to accept
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

  // Only accept if score is above threshold (players won't take bad deals)
  const acceptThreshold = 50 + (fa.overall - 70);  // Better players more demanding
  if (bestScore < acceptThreshold) {
    return { acceptedOffer: null, scores };
  }

  return { acceptedOffer: bestOffer, scores };
}

// Handle RFA matching
export function canMatchOffer(
  rightsTeam: { payroll: number; cap_space: number },
  offer: ContractOffer
): boolean {
  const { canSign } = canAffordContract(rightsTeam.payroll, offer.salary_per_year);
  return canSign;
}

// Validate an offer
export interface OfferValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateOffer(
  team: { payroll: number; roster_size: number },
  offer: ContractOffer,
  fa: FreeAgent
): OfferValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check roster space
  if (team.roster_size >= 15) {
    errors.push('Roster is full (15 players max)');
  }

  // Check if can afford
  const affordability = canAffordContract(team.payroll, offer.salary_per_year);
  if (!affordability.canSign) {
    errors.push('Cannot afford this contract');
  }

  // Check contract years
  if (offer.years < 1 || offer.years > 5) {
    errors.push('Contract must be 1-5 years');
  }

  // Check if offer meets minimum
  if (offer.salary_per_year < fa.market_value * 0.5) {
    warnings.push('Offer significantly below market value - unlikely to be accepted');
  }

  // Check if overpaying
  if (offer.salary_per_year > fa.market_value * 1.5) {
    warnings.push('Offer significantly above market value');
  }

  // Tax warnings
  if (affordability.taxImplication > 0) {
    warnings.push(`This signing will incur $${(affordability.taxImplication / 1_000_000).toFixed(1)}M in luxury tax`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Generate CPU team offers for a free agent
export function generateCPUOffers(
  fa: FreeAgent,
  interestedTeams: TeamContext[],
  maxOffers: number = 3
): Array<{ offer: ContractOffer; team: TeamContext }> {
  const offers: Array<{ offer: ContractOffer; team: TeamContext }> = [];

  // Sort teams by how much they need this player
  const sortedTeams = [...interestedTeams].sort((a, b) => {
    const aScore = (a.needs_position ? 30 : 0) + (15 - a.roster_size) * 2 + (82 - a.wins) / 2;
    const bScore = (b.needs_position ? 30 : 0) + (15 - b.roster_size) * 2 + (82 - b.wins) / 2;
    return bScore - aScore;
  });

  for (const team of sortedTeams.slice(0, maxOffers)) {
    // Determine offer based on team need
    const needMultiplier = team.needs_position ? 1.1 : 0.95;
    const offerSalary = Math.round(fa.market_value * needMultiplier);

    // Determine years based on age
    let years: number;
    if (fa.age <= 27) {
      years = Math.min(4, Math.floor(Math.random() * 3) + 2);
    } else if (fa.age <= 32) {
      years = Math.min(3, Math.floor(Math.random() * 2) + 2);
    } else {
      years = Math.floor(Math.random() * 2) + 1;
    }

    offers.push({
      offer: {
        team_id: team.team_id,
        player_id: fa.player_id,
        years,
        salary_per_year: Math.round(offerSalary / 100_000) * 100_000,
        total_value: offerSalary * years
      },
      team
    });
  }

  return offers;
}
