// Contract System
// Based on GAME_DESIGN.md Section 5.4

export interface Contract {
  id: string;
  player_id: string;
  team_id: string;
  total_years: number;
  years_remaining: number;
  base_salary: number;
  year_1_salary: number;
  year_2_salary?: number;
  year_3_salary?: number;
  year_4_salary?: number;
  year_5_salary?: number;
  player_option_year?: number;
  team_option_year?: number;
  no_trade_clause: boolean;
  signing_bonus: number;
  trade_bonus: number;
  incentive_bonus: number;
  contract_type: ContractType;
  status: ContractStatus;
  signed_date: Date;
}

export type ContractType =
  | 'standard'
  | 'rookie_scale'
  | 'veteran_minimum'
  | 'mid_level'
  | 'bi_annual'
  | 'two_way'
  | '10_day';

export type ContractStatus = 'active' | 'expired' | 'bought_out' | 'waived' | 'traded';

export interface ContractOffer {
  team_id: string;
  player_id: string;
  years: number;
  salary_per_year: number;
  total_value: number;
  player_option?: boolean;
  team_option?: boolean;
  no_trade_clause?: boolean;
  signing_bonus?: number;
  incentive_bonus?: number;
  is_offer_sheet?: boolean;
  is_matching?: boolean;
}

// Salary Cap Constants (based on GAME_DESIGN.md Section 5.3)
export const SALARY_CAP = {
  cap: 140_000_000,           // $140M soft cap
  luxury_tax: 170_000_000,    // $170M tax line
  first_apron: 178_000_000,   // $178M first apron
  second_apron: 189_000_000,  // $189M second apron
  minimum: 126_000_000        // 90% of cap
};

// Max salary by years of service
export function getMaxSalary(yearsInLeague: number): number {
  if (yearsInLeague >= 10) {
    return Math.round(SALARY_CAP.cap * 0.35); // ~$49M
  } else if (yearsInLeague >= 6) {
    return Math.round(SALARY_CAP.cap * 0.30); // ~$42M
  } else {
    return Math.round(SALARY_CAP.cap * 0.25); // ~$35M
  }
}

// Minimum salary by years of service
export function getMinSalary(yearsInLeague: number): number {
  const baseMins: Record<number, number> = {
    0: 1_100_000,
    1: 1_800_000,
    2: 2_000_000,
    3: 2_200_000,
    4: 2_400_000,
    5: 2_600_000,
    6: 2_800_000,
    7: 2_900_000,
    8: 3_000_000,
    9: 3_100_000
  };
  return baseMins[Math.min(yearsInLeague, 9)] || 3_200_000;
}

// Calculate player's market value based on overall and age
export function calculateMarketValue(
  overall: number,
  age: number,
  yearsInLeague: number,
  potential: number
): number {
  const maxSalary = getMaxSalary(yearsInLeague);
  const minSalary = getMinSalary(yearsInLeague);

  // Base value from overall rating
  let valuePercent: number;

  if (overall >= 90) {
    valuePercent = 1.0;  // Max contract
  } else if (overall >= 85) {
    valuePercent = 0.85 + ((overall - 85) / 5) * 0.15;
  } else if (overall >= 80) {
    valuePercent = 0.65 + ((overall - 80) / 5) * 0.20;
  } else if (overall >= 75) {
    valuePercent = 0.45 + ((overall - 75) / 5) * 0.20;
  } else if (overall >= 70) {
    valuePercent = 0.25 + ((overall - 70) / 5) * 0.20;
  } else if (overall >= 65) {
    valuePercent = 0.10 + ((overall - 65) / 5) * 0.15;
  } else {
    valuePercent = 0.05;  // League minimum area
  }

  // Age adjustment (prime is 25-30)
  let ageMultiplier = 1.0;
  if (age < 24) {
    // Young with upside - boost if high potential
    ageMultiplier = 0.9 + (potential - 70) / 100;
  } else if (age > 32) {
    // Declining - reduce value
    ageMultiplier = 1.0 - ((age - 32) * 0.08);
  }

  valuePercent *= Math.max(0.5, ageMultiplier);

  // Calculate actual salary
  let salary = minSalary + (maxSalary - minSalary) * valuePercent;

  // Round to nearest $100K
  salary = Math.round(salary / 100_000) * 100_000;

  return Math.max(minSalary, Math.min(maxSalary, salary));
}

// Generate yearly salaries with raises
export function generateYearlySalaries(
  baseSalary: number,
  years: number,
  raisePercent: number = 0.08  // 8% annual raise
): number[] {
  const salaries: number[] = [baseSalary];

  for (let i = 1; i < years; i++) {
    const raised = Math.round(salaries[i - 1] * (1 + raisePercent));
    salaries.push(Math.round(raised / 100_000) * 100_000);
  }

  return salaries;
}

// Create a contract from an offer
export function createContractFromOffer(
  offer: ContractOffer,
  playerId: string,
  seasonId: string
): Partial<Contract> {
  const salaries = generateYearlySalaries(offer.salary_per_year, offer.years);

  return {
    player_id: playerId,
    team_id: offer.team_id,
    total_years: offer.years,
    years_remaining: offer.years,
    base_salary: offer.salary_per_year,
    year_1_salary: salaries[0],
    year_2_salary: salaries[1],
    year_3_salary: salaries[2],
    year_4_salary: salaries[3],
    year_5_salary: salaries[4],
    player_option_year: offer.player_option ? offer.years : undefined,
    team_option_year: offer.team_option ? offer.years : undefined,
    no_trade_clause: offer.no_trade_clause || false,
    signing_bonus: offer.signing_bonus || 0,
    incentive_bonus: offer.incentive_bonus || 0,
    contract_type: 'standard',
    status: 'active',
    signed_date: new Date()
  };
}

// Check if team can afford a contract
export function canAffordContract(
  currentPayroll: number,
  newSalary: number,
  capSpace?: number
): { canSign: boolean; method: string; taxImplication: number } {
  const totalPayroll = currentPayroll + newSalary;

  // Under the cap - full cap space available
  if (currentPayroll < SALARY_CAP.cap) {
    const availableSpace = SALARY_CAP.cap - currentPayroll;
    if (newSalary <= availableSpace) {
      return {
        canSign: true,
        method: 'cap_space',
        taxImplication: 0
      };
    }
  }

  // Over the cap but under tax - can use exceptions
  if (totalPayroll <= SALARY_CAP.luxury_tax) {
    return {
      canSign: true,
      method: 'exception',
      taxImplication: 0
    };
  }

  // In luxury tax territory
  if (totalPayroll <= SALARY_CAP.first_apron) {
    const taxAmount = (totalPayroll - SALARY_CAP.luxury_tax) * 1.5;
    return {
      canSign: true,
      method: 'luxury_tax',
      taxImplication: taxAmount
    };
  }

  // Above first apron - heavily restricted
  if (totalPayroll <= SALARY_CAP.second_apron) {
    const taxAmount = (totalPayroll - SALARY_CAP.luxury_tax) * 2.5;
    return {
      canSign: true,
      method: 'first_apron',
      taxImplication: taxAmount
    };
  }

  // Above second apron - extremely restricted
  const taxAmount = (totalPayroll - SALARY_CAP.luxury_tax) * 4.0;
  return {
    canSign: true,
    method: 'second_apron',
    taxImplication: taxAmount
  };
}

// Calculate luxury tax owed
export function calculateLuxuryTax(payroll: number): number {
  if (payroll <= SALARY_CAP.luxury_tax) {
    return 0;
  }

  const overTax = payroll - SALARY_CAP.luxury_tax;

  // Progressive tax rates
  let tax = 0;
  let remaining = overTax;

  // First $5M: 1.5x
  const tier1 = Math.min(remaining, 5_000_000);
  tax += tier1 * 1.5;
  remaining -= tier1;

  // Next $5M: 1.75x
  const tier2 = Math.min(remaining, 5_000_000);
  tax += tier2 * 1.75;
  remaining -= tier2;

  // Next $5M: 2.5x
  const tier3 = Math.min(remaining, 5_000_000);
  tax += tier3 * 2.5;
  remaining -= tier3;

  // Next $5M: 3.25x
  const tier4 = Math.min(remaining, 5_000_000);
  tax += tier4 * 3.25;
  remaining -= tier4;

  // Beyond: 4.0x (repeater tax is higher)
  tax += remaining * 4.0;

  return Math.round(tax);
}
