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

const POSITION_DISTANCE_BIAS: Record<string, number> = {
  PG: 15, SG: 15, SF: 10, PF: 6, C: 4
};

const TIER_MULTIPLIERS: Record<string, number> = {
  bronze: 0.5, silver: 0.75, gold: 1.0, hall_of_fame: 1.5
};

function getRelevantAttribute(player: SimPlayer, shotType: ShotType): number {
  if (['dunk', 'layup', 'floater', 'hook_shot', 'post_fadeaway', 'alley_oop', 'putback', 'tip_in'].includes(shotType)) {
    return player.attributes.inside_scoring;
  }
  if (['mid_range_pull_up', 'mid_range_catch_shoot'].includes(shotType)) {
    return player.attributes.mid_range;
  }
  if (shotType === 'free_throw') {
    return player.attributes.free_throw;
  }
  return player.attributes.three_point;
}

function getFatigueModifier(fatigue: number): number {
  if (fatigue < 30) return 1.0;
  if (fatigue < 50) return 0.97;
  if (fatigue < 70) return 0.92;
  if (fatigue < 85) return 0.85;
  return 0.75;
}

function getClutchModifier(context: ShotContext, player: SimPlayer): number {
  const isClutch = context.game_clock <= 120 && context.quarter >= 4 && Math.abs(context.score_differential) <= 5;
  if (!isClutch) return 1.0;
  return 0.85 + (player.attributes.clutch / 99) * 0.30;
}

function isPerimeterShot(shotType: ShotType): boolean {
  return shotType.includes('three') || shotType.includes('mid');
}

export function determineContestLevel(
  shooter: SimPlayer,
  defender: SimPlayer | null,
  shotType: ShotType,
  isFastBreak: boolean
): ContestLevel {
  if (!defender) return 'open';
  if (isFastBreak) return Math.random() < 0.6 ? 'open' : 'light';

  const defenseRating = isPerimeterShot(shotType)
    ? defender.attributes.perimeter_defense
    : defender.attributes.interior_defense;

  const roll = Math.random() * 100 + (shooter.attributes.ball_handling - defenseRating) * 0.5;

  if (roll > 85) return 'open';
  if (roll > 65) return 'light';
  if (roll > 40) return 'moderate';
  if (roll > 20) return 'heavy';
  return 'smothered';
}

export function calculateShotProbability(context: ShotContext): number {
  const { shooter, defender, shot_type } = context;

  let probability = (getRelevantAttribute(shooter, shot_type) / 99) * BASE_PERCENTAGES[shot_type];
  probability *= CONTEST_MODIFIERS[context.contest_level];

  if (defender && context.is_contested) {
    const defenseRating = isPerimeterShot(shot_type)
      ? defender.attributes.perimeter_defense
      : defender.attributes.interior_defense;
    probability *= 1 - ((defenseRating - 50) / 99) * 0.15;
  }

  probability *= getFatigueModifier(context.shooter_fatigue);
  probability *= getClutchModifier(context, shooter);

  const consistencyMod = (shooter.attributes.consistency - 50) / 100;
  const variance = (1 - Math.abs(consistencyMod)) * 0.1;
  probability *= 1 + (Math.random() - 0.5) * 2 * variance;

  for (const trait of shooter.traits) {
    const traitMod = TRAIT_SHOT_MODIFIERS[trait.name];
    if (traitMod && traitMod.applies_to(shot_type)) {
      const effectiveMod = 1 + (traitMod.modifier - 1) * (TIER_MULTIPLIERS[trait.tier] || 1);
      probability *= effectiveMod;
    }
  }

  probability *= 1 + getHotColdModifier(shooter);

  return Math.max(0.02, Math.min(0.98, probability));
}

export function executeShot(context: ShotContext): ShotResult {
  const probability = calculateShotProbability(context);
  const made = Math.random() < probability;

  let points = 0;
  if (made) {
    if (context.shot_type.includes('three')) {
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

export function selectShotType(
  shooter: SimPlayer,
  distanceFromBasket: number,
  shotClock: number,
  _isContested: boolean
): ShotType {
  const attrs = shooter.attributes;

  if (distanceFromBasket < 4) {
    if (attrs.vertical > 70 && attrs.inside_scoring > 70 && Math.random() < 0.4) {
      return 'dunk';
    }
    return 'layup';
  }

  if (distanceFromBasket < 10) {
    if (Math.random() < (attrs.inside_scoring * 0.3) / 99) return 'floater';
    if ((shooter.position === 'C' || shooter.position === 'PF') && Math.random() < 0.5) {
      return Math.random() < 0.5 ? 'hook_shot' : 'post_fadeaway';
    }
    return 'layup';
  }

  if (distanceFromBasket < 22) {
    return Math.random() < 0.6 ? 'mid_range_catch_shoot' : 'mid_range_pull_up';
  }

  if (distanceFromBasket < 28) {
    if (Math.random() < 0.25) return 'three_point_corner';
    if (shotClock < 6) {
      return Math.random() < 0.5 ? 'three_point_pull_up' : 'three_point_step_back';
    }
    return Math.random() < 0.6 ? 'three_point_catch_shoot' : 'three_point_pull_up';
  }

  return 'three_point_deep';
}

export function calculateShotDistance(shooter: SimPlayer, _action: string): number {
  if (!shooter || !shooter.attributes) return 15;

  const attrs = shooter.attributes;
  let baseBias = POSITION_DISTANCE_BIAS[shooter.position] || 10;

  if (attrs.three_point > attrs.inside_scoring + 15) {
    baseBias += 5;
  } else if (attrs.inside_scoring > attrs.three_point + 15) {
    baseBias -= 5;
  }

  const threePointBias = (attrs.three_point - 50) / 10;
  const insideBias = (attrs.inside_scoring - 50) / 10;
  const distance = baseBias + Math.random() * 12 + threePointBias - insideBias;

  return Math.max(2, Math.min(30, distance));
}
