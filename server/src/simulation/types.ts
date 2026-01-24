export type HotColdState = 'ice_cold' | 'cold' | 'normal' | 'warm' | 'hot' | 'on_fire';

export const HOT_COLD_MODIFIERS: Record<HotColdState, number> = {
  ice_cold: -0.20,
  cold: -0.10,
  normal: 0.00,
  warm: +0.08,
  hot: +0.15,
  on_fire: +0.25
};

export interface PlayerHotColdState {
  current_state: HotColdState;
  consecutive_makes: number;
  consecutive_misses: number;
  modifier: number;
}

export type ShotType =
  | 'dunk'
  | 'layup'
  | 'floater'
  | 'hook_shot'
  | 'post_fadeaway'
  | 'mid_range_pull_up'
  | 'mid_range_catch_shoot'
  | 'three_point_catch_shoot'
  | 'three_point_pull_up'
  | 'three_point_step_back'
  | 'three_point_corner'
  | 'three_point_deep'
  | 'free_throw'
  | 'alley_oop'
  | 'putback'
  | 'tip_in';

export type ContestLevel = 'open' | 'light' | 'moderate' | 'heavy' | 'smothered';

export type PlayType =
  | 'jump_ball'
  | 'made_shot'
  | 'missed_shot'
  | 'offensive_rebound'
  | 'defensive_rebound'
  | 'turnover'
  | 'steal'
  | 'block'
  | 'foul'
  | 'free_throw_made'
  | 'free_throw_missed'
  | 'timeout'
  | 'substitution'
  | 'quarter_start'
  | 'quarter_end'
  | 'end_of_period';

export type PossessionEnding =
  | 'made_shot'
  | 'missed_shot'
  | 'turnover'
  | 'foul'
  | 'end_of_period'
  | 'shot_clock_violation';

export type ActionType = 'shoot' | 'pass' | 'drive' | 'post_up' | 'pick_and_roll' | 'iso';

export interface PlayerAttributes {
  inside_scoring: number;
  close_shot: number;
  mid_range: number;
  three_point: number;
  free_throw: number;
  shot_iq: number;
  offensive_consistency: number;
  layup: number;
  standing_dunk: number;
  driving_dunk: number;
  draw_foul: number;
  post_moves: number;
  post_control: number;
  ball_handling: number;
  speed_with_ball: number;
  passing_accuracy: number;
  passing_vision: number;
  passing_iq: number;
  offensive_iq: number;
  interior_defense: number;
  perimeter_defense: number;
  steal: number;
  block: number;
  defensive_iq: number;
  defensive_consistency: number;
  lateral_quickness: number;
  help_defense_iq: number;
  offensive_rebound: number;
  defensive_rebound: number;
  box_out: number;
  rebound_timing: number;
  speed: number;
  acceleration: number;
  strength: number;
  vertical: number;
  stamina: number;
  hustle: number;
  basketball_iq: number;
  clutch: number;
  consistency: number;
  work_ethic: number;
  aggression: number;
  streakiness: number;
  composure: number;
  passing?: number;
}

export interface PlayerTrait {
  id: string;
  name: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'hall_of_fame';
  effects: TraitEffect[];
}

export interface TraitEffect {
  stat: string;
  modifier: number;
  condition?: string;
}

export interface SimPlayer {
  id: string;
  first_name: string;
  last_name: string;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  height_inches: number;
  overall: number;
  attributes: PlayerAttributes;
  traits: PlayerTrait[];
  fatigue: number;
  minutes_played: number;
  fouls: number;
  is_on_court: boolean;
  hot_cold_state: PlayerHotColdState;
  stats: PlayerGameStats;
}

export interface PlayerGameStats {
  points: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plus_minus: number;
  minutes: number;
}

export interface SimTeam {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  roster: SimPlayer[];
  starters: SimPlayer[];
  bench: SimPlayer[];
  on_court: SimPlayer[];
}

export interface GameContext {
  quarter: number;
  game_clock: number;
  shot_clock: number;
  home_score: number;
  away_score: number;
  possession_team: 'home' | 'away';
  is_clutch: boolean;
  is_fast_break: boolean;
}

export interface ShotContext {
  shooter: SimPlayer;
  defender: SimPlayer | null;
  shot_type: ShotType;
  shot_distance: number;
  shot_clock: number;
  game_clock: number;
  score_differential: number;
  quarter: number;
  is_fast_break: boolean;
  is_contested: boolean;
  contest_level: ContestLevel;
  shooter_fatigue: number;
  consecutive_minutes: number;
}

export interface PossessionContext {
  team: SimTeam;
  opponent: SimTeam;
  players_on_court: SimPlayer[];
  defenders: SimPlayer[];
  shot_clock: number;
  game_clock: number;
  quarter: number;
  score_differential: number;
  is_fast_break: boolean;
}

export interface ShotResult {
  made: boolean;
  shot_type: ShotType;
  shooter_id: string;
  defender_id: string | null;
  contested: boolean;
  distance: number;
  points: number;
  probability: number;
}

export interface PossessionResult {
  plays: Play[];
  points_scored: number;
  time_elapsed: number;
  possession_ended: boolean;
  ending: PossessionEnding;
  rebounder_id?: string;
  is_offensive_rebound?: boolean;
}

export interface Play {
  id: string;
  type: PlayType;
  quarter: number;
  game_clock: number;
  shot_clock: number;
  primary_player_id: string;
  secondary_player_id?: string;
  team_id: string;
  points: number;
  home_score: number;
  away_score: number;
  shot_type?: ShotType;
  shot_made?: boolean;
  shot_distance?: number;
  shot_contested?: boolean;
  description: string;
}

export interface QuarterResult {
  quarter: number;
  plays: Play[];
  home_points: number;
  away_points: number;
}

export interface GamePlayerStats extends PlayerGameStats {
  player_id: string;
}

export interface GameResult {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  quarters: QuarterResult[];
  plays: Play[];
  home_stats: TeamGameStats;
  away_stats: TeamGameStats;
  home_player_stats: GamePlayerStats[];
  away_player_stats: GamePlayerStats[];
  winner_id: string;
  is_overtime: boolean;
  overtime_periods: number;
}

export interface TeamGameStats {
  points: number;
  fgm: number;
  fga: number;
  fg_pct: number;
  three_pm: number;
  three_pa: number;
  three_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fast_break_points: number;
  points_in_paint: number;
  second_chance_points: number;
}

export const QUARTER_LENGTH = 720;
export const SHOT_CLOCK = 24;
export const OVERTIME_LENGTH = 300;

export const BASE_PERCENTAGES: Record<ShotType, number> = {
  dunk: 0.95,
  layup: 0.72,
  floater: 0.52,
  hook_shot: 0.55,
  post_fadeaway: 0.48,
  mid_range_pull_up: 0.47,
  mid_range_catch_shoot: 0.50,
  three_point_catch_shoot: 0.43,
  three_point_pull_up: 0.38,
  three_point_step_back: 0.36,
  three_point_corner: 0.45,
  three_point_deep: 0.32,
  free_throw: 0.88,
  alley_oop: 0.85,
  putback: 0.60,
  tip_in: 0.50
};

export const CONTEST_MODIFIERS: Record<ContestLevel, number> = {
  open: 1.10,
  light: 1.00,
  moderate: 0.85,
  heavy: 0.65,
  smothered: 0.40
};

export const POSITION_REBOUND_MODS: Record<string, number> = {
  C: 1.4, PF: 1.2, SF: 0.9, SG: 0.7, PG: 0.6
};

export const FATIGUE_EFFECTS = {
  30: { shooting: 0, speed: 0, defense: 0 },
  50: { shooting: -0.03, speed: -0.05, defense: 0 },
  70: { shooting: -0.08, speed: -0.10, defense: -0.05 },
  90: { shooting: -0.15, speed: -0.20, defense: -0.12 }
};

export const TRAIT_SHOT_MODIFIERS: Record<string, { applies_to: (type: ShotType) => boolean; modifier: number }> = {
  'Sharpshooter': { applies_to: (type) => type.includes('three'), modifier: 1.08 },
  'Deep Range': { applies_to: (type) => type === 'three_point_deep', modifier: 1.25 },
  'Mid Range Maestro': { applies_to: (type) => type.includes('mid_range'), modifier: 1.10 },
  'Acrobat': { applies_to: (type) => ['layup', 'floater'].includes(type), modifier: 1.12 },
  'Posterizer': { applies_to: (type) => type === 'dunk', modifier: 1.20 },
  'Cold Blooded': { applies_to: () => true, modifier: 1.15 },
  'Spot Up Specialist': { applies_to: (type) => type.includes('catch_shoot'), modifier: 1.10 },
  'Glass Cleaner': { applies_to: () => false, modifier: 1.0 }
};
