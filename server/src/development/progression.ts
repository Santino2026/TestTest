// Player Development & Aging System
// Based on GAME_DESIGN.md Section 4.6

export interface AttributeChanges {
  [attribute: string]: number;
}

export interface DevelopmentResult {
  player_id: string;
  player_name: string;
  previous_overall: number;
  new_overall: number;
  age: number;
  phase: 'development' | 'peak' | 'decline';
  changes: AttributeChanges;
}

export type DevelopmentSpeed = 'slow' | 'normal' | 'fast';

// Physical attributes (decline faster with age)
const PHYSICAL_ATTRIBUTES = [
  'speed', 'acceleration', 'vertical', 'stamina', 'strength',
  'lateral_quickness', 'hustle'
];

// Skill attributes (decline slower with age)
const SKILL_ATTRIBUTES = [
  'inside_scoring', 'close_shot', 'mid_range', 'three_point', 'free_throw',
  'layup', 'standing_dunk', 'driving_dunk', 'post_moves', 'post_control',
  'ball_handling', 'passing_accuracy', 'passing_vision', 'steal', 'block'
];

// IQ attributes (can improve with age)
const IQ_ATTRIBUTES = [
  'shot_iq', 'offensive_iq', 'passing_iq', 'defensive_iq', 'basketball_iq',
  'help_defense_iq', 'offensive_consistency', 'defensive_consistency'
];

// Archetype weightings for attribute development
const ARCHETYPE_WEIGHTS: Record<string, Record<string, number>> = {
  floor_general: { ball_handling: 1.5, passing_accuracy: 1.5, passing_vision: 1.5, basketball_iq: 1.3 },
  scoring_pg: { three_point: 1.3, mid_range: 1.2, speed: 1.3, ball_handling: 1.2 },
  combo_guard: { three_point: 1.2, passing_accuracy: 1.1, speed: 1.2 },
  defensive_pest: { perimeter_defense: 1.5, steal: 1.4, lateral_quickness: 1.3 },
  sharpshooter: { three_point: 1.6, mid_range: 1.3, free_throw: 1.3 },
  slashing_sg: { driving_dunk: 1.4, layup: 1.3, speed: 1.3, acceleration: 1.2 },
  two_way_guard: { perimeter_defense: 1.3, three_point: 1.2, steal: 1.2 },
  athletic_finisher: { driving_dunk: 1.5, vertical: 1.4, speed: 1.3 },
  two_way_wing: { perimeter_defense: 1.3, three_point: 1.2, strength: 1.2 },
  point_forward: { passing_accuracy: 1.4, passing_vision: 1.3, ball_handling: 1.3 },
  stretch_wing: { three_point: 1.4, mid_range: 1.2, defensive_rebound: 1.2 },
  '3_and_d': { three_point: 1.3, perimeter_defense: 1.4 },
  stretch_four: { three_point: 1.4, defensive_rebound: 1.2, strength: 1.2 },
  power_post: { post_moves: 1.5, post_control: 1.4, strength: 1.4, interior_defense: 1.2 },
  mobile_big: { speed: 1.3, lateral_quickness: 1.3, perimeter_defense: 1.2 },
  rim_runner: { vertical: 1.4, speed: 1.3, standing_dunk: 1.4, offensive_rebound: 1.2 },
  rim_protector: { block: 1.5, interior_defense: 1.5, defensive_rebound: 1.3 },
  versatile_big: { interior_defense: 1.2, perimeter_defense: 1.2, passing_accuracy: 1.2 },
  post_scorer: { post_moves: 1.5, post_control: 1.4, inside_scoring: 1.4 },
  defensive_anchor: { block: 1.4, interior_defense: 1.5, help_defense_iq: 1.3 }
};

// Development speed modifiers
const SPEED_MODIFIERS: Record<DevelopmentSpeed, number> = {
  slow: 0.7,
  normal: 1.0,
  fast: 1.4
};

// Random range helper
function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Random integer helper
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Calculate overall from attributes (simplified average)
export function calculateOverall(attributes: Record<string, number>): number {
  const attrValues = Object.values(attributes).filter(v => typeof v === 'number');
  if (attrValues.length === 0) return 50;
  return Math.round(attrValues.reduce((sum, v) => sum + v, 0) / attrValues.length);
}

// Get minutes modifier (more playing time = better development)
function getMinutesModifier(seasonMinutes: number): number {
  // Assuming 82 games * 48 minutes = 3936 max minutes
  // Starter (~30 min/game) = 2460 minutes
  // Rotation (~20 min/game) = 1640 minutes
  // Bench (~10 min/game) = 820 minutes

  if (seasonMinutes >= 2500) return 1.3;  // Star minutes
  if (seasonMinutes >= 2000) return 1.15; // Starter
  if (seasonMinutes >= 1500) return 1.0;  // Rotation
  if (seasonMinutes >= 1000) return 0.85; // Bench
  return 0.7; // Deep bench
}

// Distribute gains across attributes based on archetype
function distributeGains(
  archetype: string,
  totalGain: number,
  currentAttributes: Record<string, number>
): AttributeChanges {
  const changes: AttributeChanges = {};
  const weights = ARCHETYPE_WEIGHTS[archetype] || {};

  // Get all attribute names
  const allAttributes = [...PHYSICAL_ATTRIBUTES, ...SKILL_ATTRIBUTES, ...IQ_ATTRIBUTES];

  // Calculate total weight
  let totalWeight = 0;
  for (const attr of allAttributes) {
    totalWeight += weights[attr] || 1.0;
  }

  // Distribute gains proportionally
  for (const attr of allAttributes) {
    const weight = weights[attr] || 1.0;
    const share = (weight / totalWeight) * totalGain;

    // Add some randomness
    const gain = share * randomRange(0.7, 1.3);

    // Only apply if attribute isn't already at cap
    const currentValue = currentAttributes[attr] || 50;
    if (currentValue < 99) {
      changes[attr] = Math.round(Math.min(gain, 99 - currentValue));
    }
  }

  return changes;
}

// Get small fluctuations during peak years
function getSmallFluctuations(currentAttributes: Record<string, number>): AttributeChanges {
  const changes: AttributeChanges = {};

  // Pick 3-5 random attributes to fluctuate
  const allAttributes = [...PHYSICAL_ATTRIBUTES, ...SKILL_ATTRIBUTES, ...IQ_ATTRIBUTES];
  const numChanges = randomInt(3, 5);

  for (let i = 0; i < numChanges; i++) {
    const attr = allAttributes[randomInt(0, allAttributes.length - 1)];
    const change = randomInt(-2, 2);
    const currentValue = currentAttributes[attr] || 50;
    const newValue = Math.max(30, Math.min(99, currentValue + change));
    changes[attr] = newValue - currentValue;
  }

  return changes;
}

// Main development function
export function developPlayer(player: {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  overall: number;
  potential: number;
  peak_age: number;
  archetype: string;
  work_ethic: number;
  coachability?: number;
  attributes: Record<string, number>;
  season_minutes?: number;
}): DevelopmentResult {
  const age = player.age;
  const potential = player.potential;
  const peakAge = player.peak_age;
  const workEthic = player.work_ethic || 60;
  const coachability = player.coachability || 60;

  // Determine development speed based on peak age
  let devSpeed: DevelopmentSpeed;
  if (peakAge <= 26) {
    devSpeed = 'fast';
  } else if (peakAge >= 30) {
    devSpeed = 'slow';
  } else {
    devSpeed = 'normal';
  }

  let changes: AttributeChanges = {};
  let phase: 'development' | 'peak' | 'decline';

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: DEVELOPMENT (age < peak_age)
  // ═══════════════════════════════════════════════════════════

  if (age < peakAge) {
    phase = 'development';
    const yearsToGo = Math.max(1, peakAge - age);
    const currentOverall = player.overall;
    const gapToPotential = Math.max(0, potential - currentOverall);

    // Base improvement per year
    let baseGain = gapToPotential / yearsToGo;

    // Development speed modifier
    const speedMod = SPEED_MODIFIERS[devSpeed];

    // Work ethic modifier (0.5x to 1.5x)
    const workMod = 0.5 + (workEthic / 100);

    // Coachability modifier (0.8x to 1.2x)
    const coachMod = 0.8 + (coachability / 250);

    // Playing time modifier
    const minutesMod = getMinutesModifier(player.season_minutes || 1500);

    // Final gain
    const totalGain = baseGain * speedMod * workMod * coachMod * minutesMod;

    // Distribute across attributes
    changes = distributeGains(player.archetype, totalGain, player.attributes);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: PEAK (peak_age to peak_age + 3)
  // ═══════════════════════════════════════════════════════════

  else if (age <= peakAge + 3) {
    phase = 'peak';
    // Small random fluctuations
    changes = getSmallFluctuations(player.attributes);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: DECLINE (age > peak_age + 3)
  // ═══════════════════════════════════════════════════════════

  else {
    phase = 'decline';
    const yearsDecline = age - (peakAge + 3);

    // Base decline rate (accelerates with age)
    let declineRate = 1 + (yearsDecline * 0.5);

    // Durability helps slow decline (assuming durability is in hidden attributes)
    // durabilityMod ranges from 1.0 (high durability) to 1.5 (low durability)
    const durability = player.attributes.durability || 60;
    const durabilityMod = 1.5 - (durability / 200);
    declineRate *= durabilityMod;

    // Physical attributes decline faster
    const physicalDecline = declineRate * 1.5;
    for (const attr of PHYSICAL_ATTRIBUTES) {
      if (player.attributes[attr]) {
        changes[attr] = -Math.round(physicalDecline * randomRange(1, 3));
      }
    }

    // Skill attributes decline slower
    const skillDecline = declineRate * 0.5;
    for (const attr of SKILL_ATTRIBUTES) {
      if (player.attributes[attr] && Math.random() < 0.5) {
        changes[attr] = -Math.round(skillDecline * randomRange(0, 2));
      }
    }

    // IQ attributes may actually INCREASE slightly
    for (const attr of IQ_ATTRIBUTES) {
      if (player.attributes[attr] && Math.random() < 0.3) {
        changes[attr] = Math.round(randomRange(-1, 2));
      }
    }
  }

  // Calculate new overall
  const newAttributes = { ...player.attributes };
  for (const [attr, change] of Object.entries(changes)) {
    if (newAttributes[attr] !== undefined) {
      newAttributes[attr] = Math.max(30, Math.min(99, newAttributes[attr] + change));
    }
  }

  const newOverall = calculateOverall(newAttributes);

  return {
    player_id: player.id,
    player_name: `${player.first_name} ${player.last_name}`,
    previous_overall: player.overall,
    new_overall: newOverall,
    age: player.age,
    phase,
    changes
  };
}

// Process aging (increment age)
export function agePlayer(currentAge: number): number {
  return currentAge + 1;
}

// Check for retirement
export function shouldRetire(age: number, overall: number, yearsInLeague: number): boolean {
  // Base retirement chance by age
  let retireChance = 0;

  if (age >= 40) {
    retireChance = 0.8;
  } else if (age >= 38) {
    retireChance = 0.5;
  } else if (age >= 36) {
    retireChance = 0.25;
  } else if (age >= 34) {
    retireChance = 0.1;
  }

  // Low overall increases retirement chance
  if (overall < 60) {
    retireChance += 0.2;
  } else if (overall < 65) {
    retireChance += 0.1;
  }

  // Veterans less likely to retire if still good
  if (yearsInLeague >= 15 && overall >= 70) {
    retireChance *= 0.7;
  }

  return Math.random() < retireChance;
}

// Batch process all players for offseason development
export function processOffseasonDevelopment(players: Array<{
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  overall: number;
  potential: number;
  peak_age: number;
  archetype: string;
  work_ethic: number;
  coachability?: number;
  attributes: Record<string, number>;
  season_minutes?: number;
}>): DevelopmentResult[] {
  return players.map(player => developPlayer(player));
}
