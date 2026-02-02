import { SimPlayer } from '../types';

export function executePass(
  passer: SimPlayer,
  defenders: SimPlayer[]
): { success: boolean; stolen: boolean; stealer_id?: string } {
  // Pick defender most likely to steal based on steal attribute
  const sortedDefenders = [...defenders].sort((a, b) => b.attributes.steal - a.attributes.steal);
  const defender = Math.random() < 0.6 ? sortedDefenders[0] : defenders[Math.floor(Math.random() * defenders.length)];

  // Reduced steal rates for higher scoring
  const baseStealChance = 0.015; // 1.5% base
  const defenderBonus = (defender.attributes.steal / 99) * 0.025;
  const passerPenalty = ((passer.attributes.passing_accuracy || 70) / 99) * 0.02;
  const stealChance = baseStealChance + defenderBonus - passerPenalty;

  if (Math.random() < stealChance) {
    return { success: false, stolen: true, stealer_id: defender.id };
  }

  const successRate = 0.98 + ((passer.attributes.passing_accuracy || 70) / 99) * 0.02; // Very few bad passes
  return { success: Math.random() < successRate, stolen: false };
}

// Check for steal during dribbling/ball handling
export function checkDribbleSteal(
  ballHandler: SimPlayer,
  defenders: SimPlayer[]
): { stolen: boolean; stealer_id?: string } {
  // Sort by steal attribute, best defender most likely to attempt
  const sortedDefenders = [...defenders].sort((a, b) => b.attributes.steal - a.attributes.steal);
  const defender = Math.random() < 0.5 ? sortedDefenders[0] : defenders[Math.floor(Math.random() * defenders.length)];

  // Ball handling vs steal matchup - reduced for higher scoring
  const handleBonus = (ballHandler.attributes.ball_handling / 99) * 0.03;
  const stealBonus = (defender.attributes.steal / 99) * 0.02;
  const baseChance = 0.008; // 0.8% base chance per dribble action
  const stealChance = baseChance + stealBonus - handleBonus;

  if (Math.random() < stealChance) {
    return { stolen: true, stealer_id: defender.id };
  }
  return { stolen: false };
}
