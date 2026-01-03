export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export type Archetype =
  | 'floor_general' | 'scoring_pg'      // PG
  | 'sharpshooter' | 'playmaking_sg'    // SG
  | 'isolation_scorer' | 'swingman'     // SF
  | 'stretch_4' | 'post_scorer'         // PF
  | 'rim_protector' | 'swiss_army';     // C

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string | null;
  position: Position;
  secondary_position: Position | null;
  archetype: Archetype;
  height_inches: number;
  weight_lbs: number;
  age: number;
  overall: number;
  potential: number;
  jersey_number: number;
  years_pro: number;
  created_at: Date;
}

export interface PlayerAttributes {
  player_id: string;
  // Scoring
  inside_scoring: number;
  mid_range: number;
  three_point: number;
  free_throw: number;
  shot_iq: number;
  // Ball Handling
  ball_handling: number;
  passing: number;
  offensive_iq: number;
  // Defense
  perimeter_defense: number;
  interior_defense: number;
  steal: number;
  block: number;
  defensive_iq: number;
  // Physical
  speed: number;
  acceleration: number;
  strength: number;
  vertical: number;
  stamina: number;
  // Mental
  clutch: number;
  consistency: number;
  work_ethic: number;
}

export type TraitTier = 'bronze' | 'silver' | 'gold' | 'hall_of_fame';

export interface PlayerTrait {
  player_id: string;
  trait_id: string;
  tier: TraitTier;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  category: string;
}
