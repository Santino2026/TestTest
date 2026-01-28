import { HotColdState, PlayerHotColdState, HOT_COLD_MODIFIERS, SimPlayer } from './types';

interface StateTransitionConfig {
  makesToWarm: number;
  makesToHot: number;
  makesToOnFire: number;
  missesToCold: number;
  missesToIceCold: number;
}

function getTransitionConfig(streakiness: number): StateTransitionConfig {
  if (streakiness >= 80) {
    return { makesToWarm: 2, makesToHot: 3, makesToOnFire: 4, missesToCold: 2, missesToIceCold: 3 };
  }
  if (streakiness >= 65) {
    return { makesToWarm: 3, makesToHot: 4, makesToOnFire: 5, missesToCold: 2, missesToIceCold: 4 };
  }
  if (streakiness >= 45) {
    return { makesToWarm: 4, makesToHot: 5, makesToOnFire: 7, missesToCold: 3, missesToIceCold: 5 };
  }
  if (streakiness >= 30) {
    return { makesToWarm: 5, makesToHot: 7, makesToOnFire: 10, missesToCold: 4, missesToIceCold: 7 };
  }
  return { makesToWarm: 8, makesToHot: 12, makesToOnFire: 999, missesToCold: 6, missesToIceCold: 10 };
}

export function initializeHotColdState(): PlayerHotColdState {
  return { current_state: 'normal', consecutive_makes: 0, consecutive_misses: 0, modifier: 0 };
}

export function updateHotColdState(player: SimPlayer, shotMade: boolean): PlayerHotColdState {
  const streakiness = player.attributes.streakiness || 50;
  const config = getTransitionConfig(streakiness);
  const { current_state, consecutive_makes, consecutive_misses } = player.hot_cold_state;

  let newMakes = shotMade ? consecutive_makes + 1 : 0;
  let newMisses = shotMade ? 0 : consecutive_misses + 1;
  let newState: HotColdState = current_state;

  if (streakiness < 30) {
    if (newMakes >= config.makesToHot) {
      newState = 'warm';
    } else if (newMisses >= config.missesToCold) {
      newState = 'cold';
    } else {
      newState = 'normal';
    }
    return { current_state: newState, consecutive_makes: newMakes, consecutive_misses: newMisses, modifier: HOT_COLD_MODIFIERS[newState] };
  }

  if (shotMade) {
    switch (current_state) {
      case 'ice_cold':
        if (newMakes >= 2) { newState = 'cold'; newMakes = 0; }
        break;
      case 'cold':
        if (newMakes >= 2) { newState = 'normal'; newMakes = 0; }
        break;
      case 'normal':
        if (newMakes >= config.makesToWarm) newState = 'warm';
        break;
      case 'warm':
        if (newMakes >= config.makesToHot) newState = 'hot';
        break;
      case 'hot':
        if (newMakes >= config.makesToOnFire) newState = 'on_fire';
        break;
    }
  } else {
    switch (current_state) {
      case 'on_fire':
        newState = 'hot';
        break;
      case 'hot':
        if (newMisses >= 2) newState = 'warm';
        break;
      case 'warm':
        if (newMisses >= 2) { newState = 'normal'; newMisses = 0; }
        break;
      case 'normal':
        if (newMisses >= config.missesToCold) newState = 'cold';
        break;
      case 'cold':
        if (newMisses >= config.missesToIceCold) newState = 'ice_cold';
        break;
    }
  }

  return { current_state: newState, consecutive_makes: newMakes, consecutive_misses: newMisses, modifier: HOT_COLD_MODIFIERS[newState] };
}

export function getHotColdModifier(player: SimPlayer): number {
  return player.hot_cold_state?.modifier || 0;
}

export function getHotColdDescription(state: HotColdState): string {
  const descriptions: Record<HotColdState, string> = {
    on_fire: 'ON FIRE!',
    hot: 'heating up',
    warm: 'feeling it',
    normal: '',
    cold: 'struggling',
    ice_cold: 'ice cold'
  };
  return descriptions[state];
}

export function hasNotableState(state: HotColdState): boolean {
  return state !== 'normal';
}
