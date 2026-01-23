import { SimPlayer } from '../types';

export function executePass(
  passer: SimPlayer,
  defenders: SimPlayer[]
): { success: boolean; stolen: boolean; stealer_id?: string } {
  const defender = defenders[Math.floor(Math.random() * defenders.length)];
  const stealChance = (defender.attributes.steal / 99) * 0.03;

  if (Math.random() < stealChance) {
    return { success: false, stolen: true, stealer_id: defender.id };
  }

  const successRate = 0.88 + ((passer.attributes.passing || 70) / 99) * 0.10;
  return { success: Math.random() < successRate, stolen: false };
}
