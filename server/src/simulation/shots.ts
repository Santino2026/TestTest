// Shot Probability Calculation
// Based on GAME_DESIGN.md Appendix A.2

import {
  SimPlayer,
  ShotContext,
  ShotResult,
  ShotType,
  ContestLevel,
  BASE_PERCENTAGES,
  CONTEST_MODIFIERS,
  TRAIT_SHOT_MODIFIERS
} from './types';
import { getHotColdModifier } from './hotcold';

// Get the relevant attribute for a shot type
function getRelevantAttribute(player: SimPlayer, shotType: ShotType): number {
  switch (shotType) {
    case 'dunk':
    case 'layup':
    case 'floater':
    case 'hook_shot':
    case 'post_fadeaway':
    case 'alley_oop':
    case 'putback':
    case 'tip_in':
      return player.attributes.inside_scoring;
    case 'mid_range_pull_up':
    case 'mid_range_catch_shoot':
      return player.attributes.mid_range;
    case 'free_throw':
      return player.attributes.free_throw;
    default:
      return player.attributes.three_point;
  }
}

// Get fatigue modifier
function getFatigueModifier(fatigue: number): number {
  if (fatigue < 30) return 1.0;
  if (fatigue < 50) return 0.97;
  if (fatigue < 70) return 0.92;
  if (fatigue < 85) return 0.85;
  return 0.75;
}

// Get clutch modifier
function getClutchModifier(context: ShotContext, player: SimPlayer): number {
  const isClutch = context.game_clock <= 120 &&
                   context.quarter >= 4 &&
                   Math.abs(context.score_differential) <= 5;

  if (!isClutch) return 1.0;

  const clutchRating = player.attributes.clutch;
  // 50 clutch = neutral, below = penalty, above = bonus
  return 0.85 + (clutchRating / 99) * 0.30; // Range: 0.85 to 1.15
}

// Determine contest level based on defender and context
export function determineContestLevel(
  shooter: SimPlayer,
  defender: SimPlayer | null,
  shotType: ShotType,
  isFastBreak: boolean
): ContestLevel {
  if (!defender) return 'open';
  if (isFastBreak) return Math.random() < 0.6 ? 'open' : 'light';

  // Calculate contest based on defender ability
  const isPerimeterShot = shotType.includes('three') || shotType.includes('mid');
  const defenseRating = isPerimeterShot
    ? defender.attributes.perimeter_defense
    : defender.attributes.interior_defense;

  // Factor in shooter's ability to create space
  const shooterSkill = shooter.attributes.ball_handling;
  const advantage = shooterSkill - defenseRating;

  // Random factor with skill influence
  const roll = Math.random() * 100 + advantage * 0.5;

  if (roll > 85) return 'open';
  if (roll > 65) return 'light';
  if (roll > 40) return 'moderate';
  if (roll > 20) return 'heavy';
  return 'smothered';
}

// Calculate shot probability
export function calculateShotProbability(context: ShotContext): number {
  const { shooter, defender, shot_type } = context;

  // 1. Get relevant attribute
  const attribute = getRelevantAttribute(shooter, shot_type);

  // 2. Calculate base percentage
  const maxPct = BASE_PERCENTAGES[shot_type];
  let probability = (attribute / 99) * maxPct;

  // 3. Apply contest modifier
  probability *= CONTEST_MODIFIERS[context.contest_level];

  // 4. Apply defender's skill (if contested)
  if (defender && context.is_contested) {
    const isPerimeterShot = shot_type.includes('three') || shot_type.includes('mid');
    const defenseRating = isPerimeterShot
      ? defender.attributes.perimeter_defense
      : defender.attributes.interior_defense;

    // Defense reduces probability further
    const defenseImpact = 1 - ((defenseRating - 50) / 99) * 0.15;
    probability *= defenseImpact;
  }

  // 5. Apply fatigue
  probability *= getFatigueModifier(context.shooter_fatigue);

  // 6. Apply clutch modifier
  probability *= getClutchModifier(context, shooter);

  // 7. Apply consistency variance
  const consistencyMod = (shooter.attributes.consistency - 50) / 100;
  const variance = (1 - Math.abs(consistencyMod)) * 0.1;
  const roll = (Math.random() - 0.5) * 2 * variance;
  probability *= (1 + roll);

  // 8. Apply relevant traits
  for (const trait of shooter.traits) {
    const traitMod = TRAIT_SHOT_MODIFIERS[trait.name];
    if (traitMod && traitMod.applies_to(shot_type)) {
      // Apply tier multiplier (GDD spec: 0.5/0.75/1.0/1.5)
      const tierMultiplier = {
        bronze: 0.5,
        silver: 0.75,
        gold: 1.0,
        hall_of_fame: 1.5
      }[trait.tier];

      const effectiveMod = 1 + (traitMod.modifier - 1) * tierMultiplier;
      probability *= effectiveMod;
    }
  }

  // 9. Apply Hot/Cold modifier (GDD Section 4.2 - "RANDOMLY HOT" system)
  // This is the critical streakiness mechanic that creates dynamic gameplay moments
  const hotColdMod = getHotColdModifier(shooter);
  probability *= (1 + hotColdMod);

  // 10. Clamp to reasonable bounds
  return Math.max(0.02, Math.min(0.98, probability));
}

// Execute a shot attempt
export function executeShot(context: ShotContext): ShotResult {
  const probability = calculateShotProbability(context);
  const made = Math.random() < probability;

  // Determine points
  let points = 0;
  if (made) {
    if (context.shot_type.includes('three') || context.shot_type === 'three_point_deep') {
      points = 3;
    } else if (context.shot_type === 'free_throw') {
      points = 1;
    } else {
      points = 2;
    }
  }

  return {
    made,
    shot_type: context.shot_type,
    shooter_id: context.shooter.id,
    defender_id: context.defender?.id || null,
    contested: context.is_contested,
    distance: context.shot_distance,
    points,
    probability
  };
}

// Select shot type based on player attributes and context
export function selectShotType(
  shooter: SimPlayer,
  distanceFromBasket: number,
  shotClock: number,
  isContested: boolean
): ShotType {
  const attrs = shooter.attributes;

  // Very close to basket
  if (distanceFromBasket < 4) {
    // Can the player dunk?
    if (attrs.vertical > 70 && attrs.inside_scoring > 70 && Math.random() < 0.4) {
      return 'dunk';
    }
    return 'layup';
  }

  // In the paint (4-10 feet)
  if (distanceFromBasket < 10) {
    const floaterChance = attrs.inside_scoring * 0.3 / 99;
    if (Math.random() < floaterChance) return 'floater';

    // Post player might do hook or fadeaway
    if (shooter.position === 'C' || shooter.position === 'PF') {
      if (Math.random() < 0.5) {
        return Math.random() < 0.5 ? 'hook_shot' : 'post_fadeaway';
      }
    }
    return 'layup';
  }

  // Mid-range (10-22 feet)
  if (distanceFromBasket < 22) {
    // Pull up vs catch and shoot - assume catch and shoot more likely
    return Math.random() < 0.6 ? 'mid_range_catch_shoot' : 'mid_range_pull_up';
  }

  // Three-point range (22-28 feet)
  if (distanceFromBasket < 28) {
    // Check if corner three
    if (Math.random() < 0.25) return 'three_point_corner';

    // Low shot clock = more pull ups and step backs
    if (shotClock < 6) {
      return Math.random() < 0.5 ? 'three_point_pull_up' : 'three_point_step_back';
    }

    return Math.random() < 0.6 ? 'three_point_catch_shoot' : 'three_point_pull_up';
  }

  // Deep three (28+ feet)
  return 'three_point_deep';
}

// Calculate shot distance based on position and situation
export function calculateShotDistance(shooter: SimPlayer, action: string): number {
  const attrs = shooter.attributes;

  // Guards tend to shoot more perimeter shots
  // Bigs tend to shoot more inside
  let baseBias = 0;
  switch (shooter.position) {
    case 'PG':
    case 'SG':
      baseBias = 15; // Tend toward perimeter
      break;
    case 'SF':
      baseBias = 10;
      break;
    case 'PF':
      baseBias = 6;
      break;
    case 'C':
      baseBias = 4;
      break;
  }

  // Adjust based on shooting ability
  const threePointBias = (attrs.three_point - 50) / 10; // -5 to +5
  const insideBias = (attrs.inside_scoring - 50) / 10;

  // More likely to shoot threes if good at them
  if (attrs.three_point > attrs.inside_scoring + 15) {
    baseBias += 5;
  } else if (attrs.inside_scoring > attrs.three_point + 15) {
    baseBias -= 5;
  }

  // Random variance
  const distance = baseBias + Math.random() * 12 + threePointBias - insideBias;

  // Clamp to court dimensions
  return Math.max(2, Math.min(30, distance));
}
