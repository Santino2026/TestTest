import { SimPlayer } from '../types';

const POSITION_BALL_HANDLING_MODS: Record<string, number> = {
  PG: 1.5, SG: 1.2, SF: 1.0, PF: 0.7, C: 0.5
};

const POSITION_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

export function selectBallHandler(players: SimPlayer[]): SimPlayer {
  if (!players || players.length === 0) {
    throw new Error('selectBallHandler called with no players on court');
  }

  const weights = players.map(p =>
    (p.attributes?.ball_handling || 50) * (POSITION_BALL_HANDLING_MODS[p.position] || 1)
  );

  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;

  for (let i = 0; i < players.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return players[i];
  }

  return players[0];
}

export function getMatchupDefender(offensivePlayer: SimPlayer, defenders: SimPlayer[]): SimPlayer {
  if (!defenders || defenders.length === 0) {
    throw new Error('getMatchupDefender called with no defenders');
  }

  const positionalMatch = defenders.find(d => d.position === offensivePlayer.position);
  if (positionalMatch) return positionalMatch;

  const offIdx = POSITION_ORDER.indexOf(offensivePlayer.position);
  return defenders.reduce((best, d) => {
    const dIdx = POSITION_ORDER.indexOf(d.position);
    const bestIdx = POSITION_ORDER.indexOf(best.position);
    return Math.abs(dIdx - offIdx) < Math.abs(bestIdx - offIdx) ? d : best;
  });
}
