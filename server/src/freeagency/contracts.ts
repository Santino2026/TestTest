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

export const SALARY_CAP = {
  cap: 140_000_000,
  luxury_tax: 170_000_000,
  first_apron: 178_000_000,
  second_apron: 189_000_000,
  minimum: 126_000_000
};

const MIN_SALARY_BY_YEARS: Record<number, number> = {
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

export function getMaxSalary(yearsInLeague: number): number {
  if (yearsInLeague >= 10) return Math.round(SALARY_CAP.cap * 0.35);
  if (yearsInLeague >= 6) return Math.round(SALARY_CAP.cap * 0.30);
  return Math.round(SALARY_CAP.cap * 0.25);
}

export function getMinSalary(yearsInLeague: number): number {
  return MIN_SALARY_BY_YEARS[Math.min(yearsInLeague, 9)] ?? 3_200_000;
}

function calculateValuePercent(overall: number): number {
  if (overall >= 90) return 1.0;
  if (overall >= 85) return 0.85 + ((overall - 85) / 5) * 0.15;
  if (overall >= 80) return 0.65 + ((overall - 80) / 5) * 0.20;
  if (overall >= 75) return 0.45 + ((overall - 75) / 5) * 0.20;
  if (overall >= 70) return 0.25 + ((overall - 70) / 5) * 0.20;
  if (overall >= 65) return 0.10 + ((overall - 65) / 5) * 0.15;
  return 0.05;
}

function calculateAgeMultiplier(age: number, potential: number): number {
  if (age < 24) return 0.9 + (potential - 70) / 100;
  if (age > 32) return Math.max(0.5, 1.0 - (age - 32) * 0.08);
  return 1.0;
}

export function calculateMarketValue(
  overall: number,
  age: number,
  yearsInLeague: number,
  potential: number
): number {
  const maxSalary = getMaxSalary(yearsInLeague);
  const minSalary = getMinSalary(yearsInLeague);

  const valuePercent = calculateValuePercent(overall) * calculateAgeMultiplier(age, potential);
  const salary = minSalary + (maxSalary - minSalary) * valuePercent;
  const roundedSalary = Math.round(salary / 100_000) * 100_000;

  return Math.max(minSalary, Math.min(maxSalary, roundedSalary));
}

export function generateYearlySalaries(baseSalary: number, years: number, raisePercent: number = 0.08): number[] {
  const salaries: number[] = [baseSalary];

  for (let i = 1; i < years; i++) {
    const raised = Math.round(salaries[i - 1] * (1 + raisePercent));
    salaries.push(Math.round(raised / 100_000) * 100_000);
  }

  return salaries;
}

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
    no_trade_clause: offer.no_trade_clause ?? false,
    signing_bonus: offer.signing_bonus ?? 0,
    incentive_bonus: offer.incentive_bonus ?? 0,
    contract_type: 'standard',
    status: 'active',
    signed_date: new Date()
  };
}

function getSigningMethod(totalPayroll: number, hasCapSpace: boolean): string {
  if (hasCapSpace) return 'cap_space';
  if (totalPayroll <= SALARY_CAP.luxury_tax) return 'exception';
  if (totalPayroll <= SALARY_CAP.first_apron) return 'luxury_tax';
  if (totalPayroll <= SALARY_CAP.second_apron) return 'first_apron';
  return 'second_apron';
}

export function canAffordContract(
  currentPayroll: number,
  newSalary: number
): { canSign: boolean; method: string; taxImplication: number } {
  const totalPayroll = currentPayroll + newSalary;
  const hasCapSpace = currentPayroll < SALARY_CAP.cap && newSalary <= (SALARY_CAP.cap - currentPayroll);

  return {
    canSign: true,
    method: getSigningMethod(totalPayroll, hasCapSpace),
    taxImplication: calculateLuxuryTax(totalPayroll)
  };
}

const LUXURY_TAX_TIERS: Array<[number, number]> = [
  [5_000_000, 1.5],
  [5_000_000, 1.75],
  [5_000_000, 2.5],
  [5_000_000, 3.25],
  [Infinity, 4.0]
];

export function calculateLuxuryTax(payroll: number): number {
  if (payroll <= SALARY_CAP.luxury_tax) return 0;

  let remaining = payroll - SALARY_CAP.luxury_tax;
  let tax = 0;

  for (const [bracket, multiplier] of LUXURY_TAX_TIERS) {
    const taxableAmount = Math.min(remaining, bracket);
    tax += taxableAmount * multiplier;
    remaining -= taxableAmount;
    if (remaining <= 0) break;
  }

  return Math.round(tax);
}
