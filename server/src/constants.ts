// Shared constants across the application

// Season timing
export const SEASON_START_DATE = '2024-10-22';

// Season day boundaries
export const PRESEASON_START_DAY = -7;
export const REGULAR_SEASON_START_DAY = 1;
export const REGULAR_SEASON_END_DAY = 174;
export const DEFAULT_ALL_STAR_DAY = 85;

// Offseason phases in order
export const OFFSEASON_PHASES = ['review', 'lottery', 'draft', 'free_agency', 'training_camp'] as const;
export type OffseasonPhase = typeof OFFSEASON_PHASES[number];

export const OFFSEASON_PHASE_LABELS: Record<OffseasonPhase, string> = {
  review: 'Season Review',
  lottery: 'Draft Lottery',
  draft: 'NBA Draft',
  free_agency: 'Free Agency',
  training_camp: 'Training Camp'
};
