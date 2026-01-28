import { SimPlayer, POSITION_REBOUND_MODS } from '../types';

export function calculateReboundChance(player: SimPlayer, offensive: boolean): number {
  const rebAttr = offensive ? player.attributes.offensive_rebound : player.attributes.defensive_rebound;
  let chance = rebAttr * 0.3 + player.attributes.vertical * 0.2 + player.attributes.strength * 0.2 + player.attributes.basketball_iq * 0.1;
  chance *= (POSITION_REBOUND_MODS[player.position] || 1) * (player.height_inches / 78);

  if (player.traits.some(t => t.name === 'Glass Cleaner')) {
    chance *= 1.3;
  }

  return Math.pow(chance, 0.92);
}

export function simulateRebound(
  offensivePlayers: SimPlayer[],
  defensivePlayers: SimPlayer[]
): { rebounder: SimPlayer; offensive: boolean } {
  const candidates: { player: SimPlayer; chance: number; offensive: boolean }[] = [];

  for (const player of offensivePlayers) {
    candidates.push({ player, chance: calculateReboundChance(player, true) * 0.25, offensive: true });
  }
  for (const player of defensivePlayers) {
    candidates.push({ player, chance: calculateReboundChance(player, false), offensive: false });
  }

  const total = candidates.reduce((sum, c) => sum + c.chance, 0);
  let roll = Math.random() * total;

  for (const candidate of candidates) {
    roll -= candidate.chance;
    if (roll <= 0) return { rebounder: candidate.player, offensive: candidate.offensive };
  }

  return { rebounder: defensivePlayers[0], offensive: false };
}
