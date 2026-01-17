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

const PHYSICAL_ATTRIBUTES = [
  'speed', 'acceleration', 'vertical', 'stamina', 'strength',
  'lateral_quickness', 'hustle'
];

const SKILL_ATTRIBUTES = [
  'inside_scoring', 'close_shot', 'mid_range', 'three_point', 'free_throw',
  'layup', 'standing_dunk', 'driving_dunk', 'post_moves', 'post_control',
  'ball_handling', 'passing_accuracy', 'passing_vision', 'steal', 'block'
];

const IQ_ATTRIBUTES = [
  'shot_iq', 'offensive_iq', 'passing_iq', 'defensive_iq', 'basketball_iq',
  'help_defense_iq', 'offensive_consistency', 'defensive_consistency'
];

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

const SPEED_MODIFIERS: Record<DevelopmentSpeed, number> = {
  slow: 0.7,
  normal: 1.0,
  fast: 1.4
};

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateOverall(attributes: Record<string, number>): number {
  const attrValues = Object.values(attributes).filter(v => typeof v === 'number');
  if (attrValues.length === 0) return 50;
  return Math.round(attrValues.reduce((sum, v) => sum + v, 0) / attrValues.length);
}

function getMinutesModifier(seasonMinutes: number): number {
  if (seasonMinutes >= 2500) return 1.3;
  if (seasonMinutes >= 2000) return 1.15;
  if (seasonMinutes >= 1500) return 1.0;
  if (seasonMinutes >= 1000) return 0.85;
  return 0.7;
}

function distributeGains(
  archetype: string,
  totalGain: number,
  currentAttributes: Record<string, number>
): AttributeChanges {
  const changes: AttributeChanges = {};
  const weights = ARCHETYPE_WEIGHTS[archetype] || {};
  const allAttributes = [...PHYSICAL_ATTRIBUTES, ...SKILL_ATTRIBUTES, ...IQ_ATTRIBUTES];

  let totalWeight = 0;
  for (const attr of allAttributes) {
    totalWeight += weights[attr] || 1.0;
  }

  for (const attr of allAttributes) {
    const weight = weights[attr] || 1.0;
    const share = (weight / totalWeight) * totalGain;
    const gain = share * randomRange(0.7, 1.3);
    const currentValue = currentAttributes[attr] || 50;

    if (currentValue < 99) {
      changes[attr] = Math.round(Math.min(gain, 99 - currentValue));
    }
  }

  return changes;
}

function getSmallFluctuations(currentAttributes: Record<string, number>): AttributeChanges {
  const changes: AttributeChanges = {};
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

function getDevelopmentSpeed(peakAge: number): DevelopmentSpeed {
  if (peakAge <= 26) return 'fast';
  if (peakAge >= 30) return 'slow';
  return 'normal';
}

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
  const { age, potential, peak_age: peakAge, archetype, attributes } = player;
  const workEthic = player.work_ethic || 60;
  const coachability = player.coachability || 60;

  let changes: AttributeChanges = {};
  let phase: 'development' | 'peak' | 'decline';

  if (age < peakAge) {
    phase = 'development';
    const yearsToGo = Math.max(1, peakAge - age);
    const gapToPotential = Math.max(0, potential - player.overall);
    const baseGain = gapToPotential / yearsToGo;

    const speedMod = SPEED_MODIFIERS[getDevelopmentSpeed(peakAge)];
    const workMod = 0.5 + (workEthic / 100);
    const coachMod = 0.8 + (coachability / 250);
    const minutesMod = getMinutesModifier(player.season_minutes || 1500);

    const totalGain = baseGain * speedMod * workMod * coachMod * minutesMod;
    changes = distributeGains(archetype, totalGain, attributes);
  } else if (age <= peakAge + 3) {
    phase = 'peak';
    changes = getSmallFluctuations(attributes);
  } else {
    phase = 'decline';
    const yearsDecline = age - (peakAge + 3);
    const durability = attributes.durability || 60;
    const durabilityMod = 1.5 - (durability / 200);
    const declineRate = (1 + (yearsDecline * 0.5)) * durabilityMod;

    const physicalDecline = declineRate * 1.5;
    for (const attr of PHYSICAL_ATTRIBUTES) {
      if (attributes[attr]) {
        changes[attr] = -Math.round(physicalDecline * randomRange(1, 3));
      }
    }

    const skillDecline = declineRate * 0.5;
    for (const attr of SKILL_ATTRIBUTES) {
      if (attributes[attr] && Math.random() < 0.5) {
        changes[attr] = -Math.round(skillDecline * randomRange(0, 2));
      }
    }

    for (const attr of IQ_ATTRIBUTES) {
      if (attributes[attr] && Math.random() < 0.3) {
        changes[attr] = Math.round(randomRange(-1, 2));
      }
    }
  }

  const newAttributes = { ...attributes };
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

export function agePlayer(currentAge: number): number {
  return currentAge + 1;
}

export function shouldRetire(age: number, overall: number, yearsInLeague: number): boolean {
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

  if (overall < 60) {
    retireChance += 0.2;
  } else if (overall < 65) {
    retireChance += 0.1;
  }

  if (yearsInLeague >= 15 && overall >= 70) {
    retireChance *= 0.7;
  }

  return Math.random() < retireChance;
}

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
