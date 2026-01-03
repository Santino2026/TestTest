// Player generation utilities

const firstNames = [
  'Marcus', 'Devon', 'Terrell', 'Jamal', 'Dwayne', 'Rasheed', 'Kendrick', 'Lamar', 'Xavier', 'Quincy',
  'Tyrone', 'Cedric', 'Darnell', 'Marquis', 'Javon', 'Deshawn', 'Kareem', 'Malik', 'Hakeem', 'Rodney',
  'Travis', 'Derek', 'Curtis', 'Reginald', 'Vernon', 'Clifton', 'Marvin', 'Clayton', 'Dante', 'Lorenzo',
  'Terrance', 'Kelvin', 'Byron', 'Darryl', 'Melvin', 'Wendell', 'Otis', 'Leroy', 'Duane', 'Lamont',
  'Ricky', 'Gareth', 'Preston', 'Nolan', 'Brock', 'Wade', 'Grant', 'Reid', 'Blake', 'Trent',
  'Colton', 'Bryce', 'Shane', 'Dustin', 'Cody', 'Brett', 'Chase', 'Heath', 'Lane', 'Tucker',
  'Sergio', 'Diego', 'Mateo', 'Andres', 'Rafael', 'Esteban', 'Felipe', 'Arturo', 'Ricardo', 'Hector',
  'Nikolas', 'Stefan', 'Viktor', 'Aleksandar', 'Dragan', 'Mirko', 'Zoran', 'Milan', 'Lazar', 'Dejan',
  'Kwame', 'Oluwaseun', 'Kofi', 'Jelani', 'Sekou', 'Amadou', 'Boubacar', 'Mamadou', 'Ousmane', 'Ibrahima',
  'Yuki', 'Kenji', 'Hiroshi', 'Wei', 'Jianhao', 'Minjun', 'Seojun', 'Dorian', 'Lennox', 'Jarrett'
];

const lastNames = [
  'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson',
  'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Young', 'Allen', 'King', 'Wright',
  'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner',
  'Barnes', 'Murray', 'Grant', 'Brooks', 'Porter', 'Coleman', 'Bell', 'Warren', 'Gordon', 'Hunter',
  'Patterson', 'Sanders', 'Price', 'Bennett', 'Wood', 'Ross', 'Morgan', 'Kelly', 'Gray', 'Watson',
  'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'Marshall', 'Owens', 'Graham', 'Simpson', 'Crawford',
  'Boyd', 'Mason', 'Kennedy', 'Wells', 'Stone', 'Hawkins', 'Dunn', 'Palmer', 'Webb', 'Burke',
  'Chambers', 'Lawson', 'Barton', 'Reeves', 'Fleming', 'Sutton', 'Goodwin', 'Malone', 'Thornton', 'Singleton'
];

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type Archetype =
  | 'floor_general' | 'scoring_pg'
  | 'sharpshooter' | 'slashing_sg'
  | 'two_way_wing' | 'point_forward'
  | 'stretch_four' | 'power_post'
  | 'rim_protector' | 'versatile_big';

const archetypesByPosition: Record<Position, Archetype[]> = {
  PG: ['floor_general', 'scoring_pg'],
  SG: ['sharpshooter', 'slashing_sg'],
  SF: ['two_way_wing', 'point_forward'],
  PF: ['stretch_four', 'power_post'],
  C: ['rim_protector', 'versatile_big'],
};

const heightByPosition: Record<Position, { min: number; max: number }> = {
  PG: { min: 70, max: 76 },   // 5'10" - 6'4"
  SG: { min: 73, max: 79 },   // 6'1" - 6'7"
  SF: { min: 76, max: 82 },   // 6'4" - 6'10"
  PF: { min: 79, max: 84 },   // 6'7" - 7'0"
  C: { min: 81, max: 88 },    // 6'9" - 7'4"
};

const weightByPosition: Record<Position, { min: number; max: number }> = {
  PG: { min: 170, max: 200 },
  SG: { min: 185, max: 215 },
  SF: { min: 200, max: 235 },
  PF: { min: 220, max: 260 },
  C: { min: 240, max: 290 },
};

// Attribute tendencies by archetype (base values, will add variance)
// Updated to include all 42+ attributes from GAME_DESIGN.md Section 4.2
const archetypeAttributes: Record<Archetype, Partial<Record<string, number>>> = {
  floor_general: {
    ball_handling: 85, passing_accuracy: 85, passing_vision: 85, passing_iq: 80, speed_with_ball: 80,
    basketball_iq: 82, offensive_iq: 80, three_point: 72, perimeter_defense: 70,
    lateral_quickness: 75, help_defense_iq: 72, aggression: 55, streakiness: 45, composure: 78
  },
  scoring_pg: {
    ball_handling: 82, three_point: 80, mid_range: 78, close_shot: 75, layup: 80,
    speed: 85, acceleration: 85, speed_with_ball: 82, passing_accuracy: 70, offensive_iq: 78,
    aggression: 75, streakiness: 65, composure: 70, lateral_quickness: 78
  },
  sharpshooter: {
    three_point: 88, mid_range: 82, close_shot: 70, shot_iq: 80, free_throw: 85,
    offensive_consistency: 80, offensive_iq: 75, streakiness: 70, composure: 75,
    aggression: 45, lateral_quickness: 68, help_defense_iq: 65
  },
  slashing_sg: {
    layup: 85, driving_dunk: 82, close_shot: 78, speed: 83, acceleration: 85,
    speed_with_ball: 80, ball_handling: 75, draw_foul: 78, aggression: 82,
    streakiness: 60, composure: 68, lateral_quickness: 78, offensive_iq: 72
  },
  two_way_wing: {
    perimeter_defense: 82, steal: 78, three_point: 75, mid_range: 75, close_shot: 72,
    strength: 78, defensive_iq: 78, basketball_iq: 75, lateral_quickness: 80,
    help_defense_iq: 78, aggression: 65, streakiness: 50, composure: 75
  },
  point_forward: {
    passing_accuracy: 80, passing_vision: 78, ball_handling: 78, speed_with_ball: 75,
    basketball_iq: 80, offensive_iq: 78, three_point: 72, perimeter_defense: 72,
    lateral_quickness: 72, help_defense_iq: 70, aggression: 60, streakiness: 55, composure: 72
  },
  stretch_four: {
    three_point: 82, mid_range: 78, close_shot: 68, defensive_rebound: 78,
    interior_defense: 70, strength: 78, post_moves: 65, post_control: 60,
    box_out: 75, rebound_timing: 72, aggression: 55, streakiness: 58, composure: 70
  },
  power_post: {
    post_moves: 82, post_control: 80, interior_defense: 78, strength: 85,
    offensive_rebound: 80, defensive_rebound: 82, block: 72, close_shot: 78,
    box_out: 82, rebound_timing: 78, aggression: 75, streakiness: 50, composure: 72
  },
  rim_protector: {
    block: 85, interior_defense: 85, defensive_rebound: 82, strength: 82,
    vertical: 78, help_defense_iq: 80, box_out: 78, rebound_timing: 75,
    lateral_quickness: 65, aggression: 70, streakiness: 45, composure: 78
  },
  versatile_big: {
    interior_defense: 78, perimeter_defense: 70, passing_accuracy: 72,
    mid_range: 70, three_point: 65, close_shot: 72, basketball_iq: 75, offensive_iq: 72,
    lateral_quickness: 70, help_defense_iq: 75, box_out: 75, rebound_timing: 72,
    aggression: 60, streakiness: 52, composure: 70
  },
};

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateOverall(age: number, isPremium: boolean): number {
  // Premium players (1-2 per team) get higher ratings
  if (isPremium) {
    return random(80, 95);
  }

  // Young players (19-23) have wider range
  if (age <= 23) {
    return random(55, 78);
  }

  // Prime players (24-30)
  if (age <= 30) {
    return random(65, 82);
  }

  // Older players (31+)
  return random(58, 75);
}

function generatePotential(age: number, overall: number): number {
  // Younger players have higher potential ceiling
  if (age <= 22) {
    return Math.min(99, overall + random(5, 18));
  }
  if (age <= 25) {
    return Math.min(99, overall + random(2, 10));
  }
  if (age <= 28) {
    return Math.min(99, overall + random(0, 5));
  }
  // Older players: potential is at or slightly below current
  return Math.max(40, overall - random(0, 5));
}

function generateAttributes(archetype: Archetype, overall: number): Record<string, number> {
  const base = archetypeAttributes[archetype];

  // All 43 visible attributes from GAME_DESIGN.md Section 4.2
  const allAttributes = [
    // Shooting (8)
    'inside_scoring', 'close_shot', 'mid_range', 'three_point', 'free_throw', 'shot_iq', 'offensive_consistency',
    // Finishing (5)
    'layup', 'standing_dunk', 'driving_dunk', 'draw_foul', 'post_moves', 'post_control',
    // Playmaking (6)
    'ball_handling', 'speed_with_ball', 'passing_accuracy', 'passing_vision', 'passing_iq', 'offensive_iq',
    // Defense (8)
    'interior_defense', 'perimeter_defense', 'steal', 'block', 'defensive_iq', 'defensive_consistency',
    'lateral_quickness', 'help_defense_iq',
    // Rebounding (4)
    'offensive_rebound', 'defensive_rebound', 'box_out', 'rebound_timing',
    // Physical (6)
    'speed', 'acceleration', 'strength', 'vertical', 'stamina', 'hustle',
    // Mental (5) - THE GAME CHANGERS
    'basketball_iq', 'clutch', 'consistency', 'work_ethic', 'aggression', 'streakiness', 'composure'
  ];

  const attrs: Record<string, number> = {};
  const overallFactor = overall / 75; // Scale attributes based on overall

  for (const attr of allAttributes) {
    let value = base[attr] || random(45, 65); // Use archetype base or random default
    value = Math.round(value * overallFactor); // Scale by overall
    value += random(-8, 8); // Add variance
    value = Math.max(30, Math.min(99, value)); // Clamp to valid range
    attrs[attr] = value;
  }

  // Special handling for mental attributes - these should have wider variance
  // High streakiness = more volatile, low = steady
  attrs['streakiness'] = random(25, 85); // Wide range, not tied to overall
  // Aggression varies by player personality
  attrs['aggression'] = base['aggression'] ? base['aggression'] + random(-15, 15) : random(35, 80);
  attrs['aggression'] = Math.max(25, Math.min(95, attrs['aggression']));
  // Composure slightly correlated with experience (older players calmer)
  attrs['composure'] = base['composure'] ? base['composure'] + random(-10, 10) : random(45, 80);

  return attrs;
}

function generateHiddenAttributes(age: number, overall: number): Record<string, number> {
  // Hidden attributes from GAME_DESIGN.md Section 4.2
  return {
    peak_age: random(26, 31), // Most players peak 26-31
    durability: random(50, 95), // Injury resistance
    coachability: random(50, 90), // Learning speed
    greed: random(20, 90), // Contract demands
    ego: random(20, 90), // Demands touches
    loyalty: random(30, 85), // Re-sign likelihood
    leadership: random(30, 90), // Locker room impact
    motor: random(55, 95), // Effort level
  };
}

export function generatePlayer(teamId: string | null, position: Position, isPremium: boolean = false) {
  const firstName = pickRandom(firstNames);
  const lastName = pickRandom(lastNames);
  const archetype = pickRandom(archetypesByPosition[position]);
  const age = random(19, 35);
  const height = random(heightByPosition[position].min, heightByPosition[position].max);
  const weight = random(weightByPosition[position].min, weightByPosition[position].max);
  const overall = generateOverall(age, isPremium);
  const potential = generatePotential(age, overall);
  const yearsExperience = Math.max(0, age - 19);
  const yearsInLeague = Math.min(yearsExperience, random(0, yearsExperience));
  const hiddenAttrs = generateHiddenAttributes(age, overall);

  return {
    player: {
      first_name: firstName,
      last_name: lastName,
      team_id: teamId,
      position,
      secondary_position: null,
      archetype,
      height_inches: height,
      weight_lbs: weight,
      age,
      jersey_number: random(0, 99),
      years_pro: yearsInLeague,
      overall,
      potential,
      // Hidden attributes (from GAME_DESIGN.md)
      peak_age: hiddenAttrs.peak_age,
      durability: hiddenAttrs.durability,
      coachability: hiddenAttrs.coachability,
      greed: hiddenAttrs.greed,
      ego: hiddenAttrs.ego,
      loyalty: hiddenAttrs.loyalty,
      leadership: hiddenAttrs.leadership,
      motor: hiddenAttrs.motor,
    },
    attributes: generateAttributes(archetype, overall),
  };
}

export function generateRoster(teamId: string): ReturnType<typeof generatePlayer>[] {
  const roster: ReturnType<typeof generatePlayer>[] = [];

  // Position distribution: 2 PG, 3 SG, 3 SF, 3 PF, 2 C = 13 players
  // Plus 2 star players at random positions
  const positions: Position[] = ['PG', 'PG', 'SG', 'SG', 'SG', 'SF', 'SF', 'SF', 'PF', 'PF', 'PF', 'C', 'C'];

  // First two players are premium (stars)
  for (let i = 0; i < 2; i++) {
    roster.push(generatePlayer(teamId, pickRandom(positions), true));
  }

  // Rest are regular players
  for (const position of positions) {
    roster.push(generatePlayer(teamId, position, false));
  }

  return roster;
}
