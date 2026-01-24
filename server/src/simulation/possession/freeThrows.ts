import { v4 as uuidv4 } from 'uuid';
import { SimPlayer, PossessionContext, Play } from '../types';

export function getFreeThrowFatigueModifier(fatigue: number): number {
  if (fatigue > 70) return 0.95;
  if (fatigue > 50) return 0.98;
  return 1.0;
}

export function simulateFreeThrows(
  shooter: SimPlayer,
  numAttempts: number,
  context: PossessionContext
): { plays: Play[]; points: number } {
  const plays: Play[] = [];
  let points = 0;
  const ftBase = 0.88;
  const ftFloor = ftBase * 0.65;
  const ftChance = (ftFloor + (shooter.attributes.free_throw / 99) * (ftBase - ftFloor)) * getFreeThrowFatigueModifier(shooter.fatigue);

  for (let i = 0; i < numAttempts; i++) {
    const made = Math.random() < ftChance;
    plays.push({
      id: uuidv4(),
      type: made ? 'free_throw_made' : 'free_throw_missed',
      quarter: context.quarter,
      game_clock: context.game_clock - 2 - i,
      shot_clock: 0,
      primary_player_id: shooter.id,
      team_id: context.team.id,
      points: made ? 1 : 0,
      home_score: 0,
      away_score: 0,
      description: `${shooter.first_name} ${shooter.last_name} ${made ? 'makes' : 'misses'} free throw ${i + 1} of ${numAttempts}`
    });
    if (made) points += 1;
  }

  return { plays, points };
}
