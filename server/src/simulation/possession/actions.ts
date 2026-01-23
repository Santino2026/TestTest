import { SimPlayer, PossessionContext, ActionType } from '../types';

export function calculateActionProbabilities(
  ballHandler: SimPlayer,
  context: PossessionContext,
  shotClock: number
): Record<ActionType, number> {
  const probs: Record<ActionType, number> = {
    shoot: 0.15, pass: 0.40, drive: 0.20, post_up: 0.05, pick_and_roll: 0.15, iso: 0.05
  };

  if (!ballHandler || !ballHandler.attributes) return probs;

  const attrs = ballHandler.attributes;

  if (shotClock <= 6) {
    probs.shoot *= 2.0;
    probs.pass *= 0.5;
    probs.drive *= 1.5;
  } else if (shotClock <= 14) {
    probs.shoot *= 1.3;
    probs.drive *= 1.2;
  }

  const shootingAbility = (attrs.three_point + attrs.mid_range + attrs.inside_scoring) / 3;
  probs.shoot *= shootingAbility / 70;
  probs.pass *= (attrs.passing_accuracy || 70) / 70;
  probs.drive *= attrs.ball_handling / 70;

  if (ballHandler.position === 'C' || ballHandler.position === 'PF') {
    probs.post_up *= 3;
  }

  if (context.is_fast_break) {
    probs.shoot *= 1.5;
    probs.drive *= 1.5;
    probs.pick_and_roll *= 0.3;
    probs.iso *= 0.3;
  }

  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(probs) as ActionType[]) {
    probs[key] /= total;
  }

  return probs;
}

export function selectAction(probs: Record<ActionType, number>): ActionType {
  let roll = Math.random();
  for (const [action, prob] of Object.entries(probs)) {
    roll -= prob;
    if (roll <= 0) return action as ActionType;
  }
  return 'pass';
}
