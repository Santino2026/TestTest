// Draft Class Generation
// Based on GAME_DESIGN.md Draft System specifications

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

// First/Last name pools for prospects
const firstNames = [
  'Jaylen', 'Marcus', 'Devon', 'Terrell', 'Jamal', 'Dwayne', 'Rasheed', 'Kendrick', 'Lamar', 'Xavier',
  'Tyrone', 'Cedric', 'Darnell', 'Marquis', 'Javon', 'Deshawn', 'Kareem', 'Malik', 'Hakeem', 'Rodney',
  'Zion', 'Cade', 'Jalen', 'Paolo', 'Victor', 'Scoot', 'Amen', 'Ausar', 'Cooper', 'Brandon',
  'Anthony', 'Michael', 'LeBron', 'Kevin', 'Russell', 'James', 'Stephen', 'Devin', 'Kyrie', 'Donovan',
  'Nikola', 'Luka', 'Giannis', 'Joel', 'Jayson', 'Damian', 'Jimmy', 'Kawhi', 'Paul', 'Chris'
];

const lastNames = [
  'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson',
  'Thompson', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson',
  'Henderson', 'Washington', 'Perry', 'Howard', 'Jenkins', 'Bryant', 'Ellis', 'Murray', 'Ford', 'Hamilton',
  'Barnes', 'Grant', 'Brooks', 'Porter', 'Coleman', 'Bell', 'Warren', 'Gordon', 'Hunter', 'Patterson'
];

// Archetypes by position
const archetypesByPosition: Record<Position, string[]> = {
  PG: ['floor_general', 'scoring_pg', 'combo_guard', 'defensive_pest'],
  SG: ['sharpshooter', 'slashing_sg', 'two_way_guard', 'athletic_finisher'],
  SF: ['two_way_wing', 'point_forward', 'stretch_wing', '3_and_d'],
  PF: ['stretch_four', 'power_post', 'mobile_big', 'rim_runner'],
  C: ['rim_protector', 'versatile_big', 'post_scorer', 'defensive_anchor']
};

// Height ranges by position (in inches)
const heightByPosition: Record<Position, { min: number; max: number }> = {
  PG: { min: 71, max: 77 },   // 5'11" - 6'5"
  SG: { min: 73, max: 79 },   // 6'1" - 6'7"
  SF: { min: 76, max: 82 },   // 6'4" - 6'10"
  PF: { min: 79, max: 84 },   // 6'7" - 7'0"
  C: { min: 81, max: 88 }     // 6'9" - 7'4"
};

// Weight ranges by position
const weightByPosition: Record<Position, { min: number; max: number }> = {
  PG: { min: 170, max: 200 },
  SG: { min: 185, max: 215 },
  SF: { min: 200, max: 235 },
  PF: { min: 220, max: 260 },
  C: { min: 240, max: 290 }
};

// Archetype attribute tendencies
const archetypeAttributes: Record<string, Partial<Record<string, number>>> = {
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

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate prospect's overall based on their tier
function generateProspectOverall(tier: ProspectTier): number {
  switch (tier) {
    case 'lottery':
      return random(72, 82); // Future stars
    case 'first_round':
      return random(62, 74); // Solid starters to role players
    case 'second_round':
      return random(52, 66); // Projects and role players
    case 'undrafted':
      return random(42, 58); // Long shots
    default:
      return random(50, 65);
  }
}

// Generate potential based on overall and tier
function generateProspectPotential(overall: number, tier: ProspectTier): number {
  // Younger prospects (all 19-22) have high potential ceiling
  const potentialBonus = tier === 'lottery' ? random(12, 22) : random(8, 18);
  return Math.min(99, overall + potentialBonus);
}

// Generate all attributes for a prospect
function generateProspectAttributes(archetype: string, overall: number): Record<string, number> {
  const base = archetypeAttributes[archetype] || {};

  const allAttributes = [
    // Shooting
    'inside_scoring', 'close_shot', 'mid_range', 'three_point', 'free_throw', 'shot_iq', 'offensive_consistency',
    // Finishing
    'layup', 'standing_dunk', 'driving_dunk', 'draw_foul', 'post_moves', 'post_control',
    // Playmaking
    'ball_handling', 'speed_with_ball', 'passing_accuracy', 'passing_vision', 'passing_iq', 'offensive_iq',
    // Defense
    'interior_defense', 'perimeter_defense', 'steal', 'block', 'defensive_iq', 'defensive_consistency',
    'lateral_quickness', 'help_defense_iq',
    // Rebounding
    'offensive_rebound', 'defensive_rebound', 'box_out', 'rebound_timing',
    // Physical
    'speed', 'acceleration', 'strength', 'vertical', 'stamina', 'hustle',
    // Mental
    'basketball_iq', 'clutch', 'consistency', 'work_ethic', 'aggression', 'streakiness', 'composure'
  ];

  const attrs: Record<string, number> = {};
  const overallFactor = overall / 75;

  for (const attr of allAttributes) {
    let value = base[attr] || random(45, 65);
    value = Math.round(value * overallFactor);
    value += random(-10, 10); // More variance for prospects (unknown commodity)
    value = Math.max(30, Math.min(99, value));
    attrs[attr] = value;
  }

  // Prospects have more extreme streakiness
  attrs['streakiness'] = random(20, 90);
  attrs['composure'] = random(35, 75); // Young players less composed

  return attrs;
}

// Generate a single draft prospect
function generateProspect(tier: ProspectTier, mockPosition: number): DraftProspect {
  const position = pickRandom(['PG', 'SG', 'SF', 'PF', 'C'] as Position[]);
  const archetype = pickRandom(archetypesByPosition[position]);
  const overall = generateProspectOverall(tier);
  const potential = generateProspectPotential(overall, tier);

  return {
    id: uuidv4(),
    first_name: pickRandom(firstNames),
    last_name: pickRandom(lastNames),
    position,
    archetype,
    height_inches: random(heightByPosition[position].min, heightByPosition[position].max),
    weight_lbs: random(weightByPosition[position].min, weightByPosition[position].max),
    age: random(19, 22), // Draft prospects are young
    overall,
    potential,
    mock_draft_position: mockPosition,
    big_board_rank: mockPosition + random(-3, 3), // Some variance from mock
    peak_age: random(25, 31),
    durability: random(50, 95),
    coachability: random(50, 90),
    motor: random(55, 95),
    attributes: generateProspectAttributes(archetype, overall)
  };
}

// Generate a full draft class (60 picks + undrafted)
export function generateDraftClass(seasonId: string): DraftProspect[] {
  const prospects: DraftProspect[] = [];

  // Lottery picks (1-14): Future stars
  for (let i = 1; i <= 14; i++) {
    prospects.push(generateProspect('lottery', i));
  }

  // Rest of first round (15-30): Solid prospects
  for (let i = 15; i <= 30; i++) {
    prospects.push(generateProspect('first_round', i));
  }

  // Second round (31-60): Role players and projects
  for (let i = 31; i <= 60; i++) {
    prospects.push(generateProspect('second_round', i));
  }

  // Undrafted free agents (61-80): Long shots
  for (let i = 61; i <= 80; i++) {
    prospects.push(generateProspect('undrafted', i));
  }

  // Sort by mock draft position
  return prospects.sort((a, b) => a.mock_draft_position - b.mock_draft_position);
}

// Convert prospect to player after being drafted
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
      years_pro: 0, // Rookie
      overall: prospect.overall,
      potential: prospect.potential,
      peak_age: prospect.peak_age,
      durability: prospect.durability,
      coachability: prospect.coachability,
      greed: random(20, 80),
      ego: random(20, 80),
      loyalty: random(30, 70),
      leadership: random(30, 60), // Young players lower leadership
      motor: prospect.motor
    },
    attributes: prospect.attributes
  };
}
