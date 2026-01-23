import { v4 as uuidv4 } from 'uuid';

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type ProspectTier = 'lottery' | 'first_round' | 'second_round' | 'undrafted';

export interface DraftProspect {
  id: string;
  first_name: string;
  last_name: string;
  position: Position;
  archetype: string;
  height_inches: number;
  weight_lbs: number;
  age: number;
  overall: number;
  potential: number;
  mock_draft_position: number;
  big_board_rank: number;
  peak_age: number;
  durability: number;
  coachability: number;
  motor: number;
  attributes: Record<string, number>;
}

const FIRST_NAMES = [
  'Jaylen', 'Marcus', 'Devon', 'Terrell', 'Jamal', 'Dwayne', 'Rasheed', 'Kendrick', 'Lamar', 'Xavier',
  'Tyrone', 'Cedric', 'Darnell', 'Marquis', 'Javon', 'Deshawn', 'Kareem', 'Malik', 'Hakeem', 'Rodney',
  'Zion', 'Cade', 'Jalen', 'Paolo', 'Victor', 'Scoot', 'Amen', 'Ausar', 'Cooper', 'Brandon',
  'Anthony', 'Michael', 'LeBron', 'Kevin', 'Russell', 'James', 'Stephen', 'Devin', 'Kyrie', 'Donovan',
  'Nikola', 'Luka', 'Giannis', 'Joel', 'Jayson', 'Damian', 'Jimmy', 'Kawhi', 'Paul', 'Chris'
];

const LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson',
  'Thompson', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson',
  'Henderson', 'Washington', 'Perry', 'Howard', 'Jenkins', 'Bryant', 'Ellis', 'Murray', 'Ford', 'Hamilton',
  'Barnes', 'Grant', 'Brooks', 'Porter', 'Coleman', 'Bell', 'Warren', 'Gordon', 'Hunter', 'Patterson'
];

const ARCHETYPES_BY_POSITION: Record<Position, string[]> = {
  PG: ['floor_general', 'scoring_pg', 'combo_guard', 'defensive_pest'],
  SG: ['sharpshooter', 'slashing_sg', 'two_way_guard', 'athletic_finisher'],
  SF: ['two_way_wing', 'point_forward', 'stretch_wing', '3_and_d'],
  PF: ['stretch_four', 'power_post', 'mobile_big', 'rim_runner'],
  C: ['rim_protector', 'versatile_big', 'post_scorer', 'defensive_anchor']
};

const HEIGHT_BY_POSITION: Record<Position, { min: number; max: number }> = {
  PG: { min: 71, max: 77 },
  SG: { min: 73, max: 79 },
  SF: { min: 76, max: 82 },
  PF: { min: 79, max: 84 },
  C: { min: 81, max: 88 }
};

const WEIGHT_BY_POSITION: Record<Position, { min: number; max: number }> = {
  PG: { min: 170, max: 200 },
  SG: { min: 185, max: 215 },
  SF: { min: 200, max: 235 },
  PF: { min: 220, max: 260 },
  C: { min: 240, max: 290 }
};

const ARCHETYPE_ATTRIBUTES: Record<string, Partial<Record<string, number>>> = {
  floor_general: { ball_handling: 85, passing_accuracy: 85, passing_vision: 85, basketball_iq: 82, offensive_iq: 80 },
  scoring_pg: { three_point: 80, mid_range: 78, ball_handling: 82, speed: 85, acceleration: 85 },
  combo_guard: { three_point: 75, ball_handling: 78, passing_accuracy: 72, speed: 80 },
  defensive_pest: { perimeter_defense: 82, steal: 80, lateral_quickness: 85, hustle: 85 },
  sharpshooter: { three_point: 88, mid_range: 82, free_throw: 85, shot_iq: 80 },
  slashing_sg: { layup: 85, driving_dunk: 82, speed: 83, acceleration: 85, draw_foul: 78 },
  two_way_guard: { perimeter_defense: 78, three_point: 72, steal: 75, lateral_quickness: 78 },
  athletic_finisher: { driving_dunk: 85, vertical: 85, speed: 82, acceleration: 84 },
  two_way_wing: { perimeter_defense: 82, three_point: 75, strength: 78, defensive_iq: 78 },
  point_forward: { passing_accuracy: 80, passing_vision: 78, ball_handling: 78, basketball_iq: 80 },
  stretch_wing: { three_point: 80, mid_range: 78, defensive_rebound: 72 },
  '3_and_d': { three_point: 78, perimeter_defense: 80, steal: 72 },
  stretch_four: { three_point: 82, mid_range: 78, defensive_rebound: 78, strength: 78 },
  power_post: { post_moves: 82, post_control: 80, strength: 85, interior_defense: 78 },
  mobile_big: { speed: 75, lateral_quickness: 72, perimeter_defense: 70, three_point: 65 },
  rim_runner: { vertical: 82, speed: 78, standing_dunk: 80, offensive_rebound: 75 },
  rim_protector: { block: 85, interior_defense: 85, defensive_rebound: 82, strength: 82, vertical: 78 },
  versatile_big: { interior_defense: 78, perimeter_defense: 70, passing_accuracy: 72, three_point: 65 },
  post_scorer: { post_moves: 85, post_control: 82, inside_scoring: 82, strength: 80 },
  defensive_anchor: { block: 82, interior_defense: 85, defensive_rebound: 80, help_defense_iq: 80 }
};

const ALL_ATTRIBUTES = [
  'inside_scoring', 'close_shot', 'mid_range', 'three_point', 'free_throw', 'shot_iq', 'offensive_consistency',
  'layup', 'standing_dunk', 'driving_dunk', 'draw_foul', 'post_moves', 'post_control',
  'ball_handling', 'speed_with_ball', 'passing_accuracy', 'passing_vision', 'passing_iq', 'offensive_iq',
  'interior_defense', 'perimeter_defense', 'steal', 'block', 'defensive_iq', 'defensive_consistency',
  'lateral_quickness', 'help_defense_iq',
  'offensive_rebound', 'defensive_rebound', 'box_out', 'rebound_timing',
  'speed', 'acceleration', 'strength', 'vertical', 'stamina', 'hustle',
  'basketball_iq', 'clutch', 'consistency', 'work_ethic', 'aggression', 'streakiness', 'composure'
];

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Box-Muller for normal distribution
function normalRandom(mean: number, stdDev: number): number {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 === 0) u1 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return Math.round(mean + stdDev * z);
}

function generateProspectOverall(tier: ProspectTier): number {
  // Wider spread between tiers for meaningful differentiation
  switch (tier) {
    case 'lottery': return Math.max(72, Math.min(90, normalRandom(79, 4)));
    case 'first_round': return Math.max(62, Math.min(77, normalRandom(69, 4)));
    case 'second_round': return Math.max(50, Math.min(67, normalRandom(58, 4)));
    case 'undrafted': return Math.max(40, Math.min(57, normalRandom(48, 4)));
  }
}

function generateProspectPotential(overall: number, tier: ProspectTier): number {
  const potentialBonus = tier === 'lottery' ? random(12, 22) : random(8, 18);
  return Math.min(99, overall + potentialBonus);
}

function generateProspectAttributes(archetype: string, overall: number): Record<string, number> {
  const baseAttributes = ARCHETYPE_ATTRIBUTES[archetype] || {};
  const overallFactor = overall / 75;
  const attrs: Record<string, number> = {};

  for (const attr of ALL_ATTRIBUTES) {
    const hasBase = baseAttributes[attr] !== undefined;
    let value = baseAttributes[attr] || random(40, 60);
    value = Math.round(value * overallFactor);
    // Wider variance for archetype skills (±15), tighter for others (±10)
    value += hasBase ? random(-15, 15) : random(-10, 10);
    attrs[attr] = Math.max(25, Math.min(99, value));
  }

  attrs['streakiness'] = random(20, 90);
  attrs['composure'] = random(35, 75);

  return attrs;
}

function generateProspect(tier: ProspectTier, mockPosition: number): DraftProspect {
  const position = pickRandom(POSITIONS);
  const archetype = pickRandom(ARCHETYPES_BY_POSITION[position]);
  const overall = generateProspectOverall(tier);

  return {
    id: uuidv4(),
    first_name: pickRandom(FIRST_NAMES),
    last_name: pickRandom(LAST_NAMES),
    position,
    archetype,
    height_inches: random(HEIGHT_BY_POSITION[position].min, HEIGHT_BY_POSITION[position].max),
    weight_lbs: random(WEIGHT_BY_POSITION[position].min, WEIGHT_BY_POSITION[position].max),
    age: random(19, 22),
    overall,
    potential: generateProspectPotential(overall, tier),
    mock_draft_position: mockPosition,
    big_board_rank: mockPosition + random(-3, 3),
    peak_age: random(25, 31),
    durability: random(50, 95),
    coachability: random(50, 90),
    motor: random(55, 95),
    attributes: generateProspectAttributes(archetype, overall)
  };
}

export function generateDraftClass(): DraftProspect[] {
  const prospects: DraftProspect[] = [];

  for (let i = 1; i <= 14; i++) {
    prospects.push(generateProspect('lottery', i));
  }
  for (let i = 15; i <= 30; i++) {
    prospects.push(generateProspect('first_round', i));
  }
  for (let i = 31; i <= 60; i++) {
    prospects.push(generateProspect('second_round', i));
  }
  for (let i = 61; i <= 80; i++) {
    prospects.push(generateProspect('undrafted', i));
  }

  return prospects.sort((a, b) => a.mock_draft_position - b.mock_draft_position);
}

export function convertProspectToPlayer(prospect: DraftProspect, teamId: string): any {
  return {
    player: {
      first_name: prospect.first_name,
      last_name: prospect.last_name,
      team_id: teamId,
      position: prospect.position,
      secondary_position: null,
      archetype: prospect.archetype,
      height_inches: prospect.height_inches,
      weight_lbs: prospect.weight_lbs,
      age: prospect.age,
      jersey_number: random(0, 99),
      years_pro: 0,
      overall: prospect.overall,
      potential: prospect.potential,
      peak_age: prospect.peak_age,
      durability: prospect.durability,
      coachability: prospect.coachability,
      greed: random(20, 80),
      ego: random(20, 80),
      loyalty: random(30, 70),
      leadership: random(30, 60),
      motor: prospect.motor
    },
    attributes: prospect.attributes
  };
}
