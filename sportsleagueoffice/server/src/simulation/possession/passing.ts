import { SimPlayer } from '../types';

export function executePass(
  passer: SimPlayer,
  defenders: SimPlayer[]
): { success: boolean; stolen: boolean; stealer_id?: string } {
  // Pick defender most likely to steal based on steal attribute
  const sortedDefenders = [...defenders].sort((a, b) => b.attributes.steal - a.attributes.steal);
  const defender = Math.random() < 0.6 ? sortedDefenders[0] : defenders[Math.floor(Math.random() * defenders.length)];

  // NBA averages ~7-8 steals per team per game, ~14 total
  // ~400 passes per game = ~3.5% steal rate, but best defenders should be higher
  const baseStealChance = 0.025; // 2.5% base
  const defenderBonus = (defender.attributes.steal / 99) * 0.055; // Up to 5.5% more
  const passerPenalty = ((passer.attributes.passing_accuracy || 70) / 99) * 0.02; // Good passers reduce steal chance
  const stealChance = baseStealChance + defenderBonus - passerPenalty;

  if (Math.random() < stealChance) {
    return { success: false, stolen: true, stealer_id: defender.id };
  }

  const successRate = 0.90 + ((passer.attributes.passing_accuracy || 70) / 99) * 0.08;
  return { success: Math.random() < successRate, stolen: false };
}
