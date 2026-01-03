// Hot/Cold State System
// Implementation of GAME_DESIGN.md Section 4.2 - "RANDOMLY HOT" System

import {
  HotColdState,
  PlayerHotColdState,
  HOT_COLD_MODIFIERS,
  SimPlayer
} from './types';

// State transition thresholds based on streakiness
interface StateTransitionConfig {
  makesToWarm: number;      // Consecutive makes to go from normal -> warm
  makesToHot: number;       // Consecutive makes to go from warm -> hot
  makesToOnFire: number;    // Consecutive makes to go from hot -> on_fire
  missesToCold: number;     // Consecutive misses to go from normal -> cold
  missesToIceCold: number;  // Consecutive misses to go from cold -> ice_cold
}

// Get transition thresholds based on player's streakiness attribute
function getTransitionConfig(streakiness: number): StateTransitionConfig {
  // High streakiness (75+): Gets hot/cold quickly
  // Low streakiness (30-): Almost never changes state
  // Mid streakiness (50): Normal variance

  if (streakiness >= 80) {
    // Very streaky - catches fire easily, but also cools off fast
    return {
      makesToWarm: 2,
      makesToHot: 3,
      makesToOnFire: 4,
      missesToCold: 2,
      missesToIceCold: 3
    };
  } else if (streakiness >= 65) {
    // Moderately streaky
    return {
      makesToWarm: 3,
      makesToHot: 4,
      makesToOnFire: 5,
      missesToCold: 2,
      missesToIceCold: 4
    };
  } else if (streakiness >= 45) {
    // Normal variance
    return {
      makesToWarm: 4,
      makesToHot: 5,
      makesToOnFire: 7,
      missesToCold: 3,
      missesToIceCold: 5
    };
  } else if (streakiness >= 30) {
    // Steady player - rarely gets hot or cold
    return {
      makesToWarm: 5,
      makesToHot: 7,
      makesToOnFire: 10,
      missesToCold: 4,
      missesToIceCold: 7
    };
  } else {
    // Very steady - almost never changes from normal
    // "Steady Eddie" - predictable output, no hot streaks
    return {
      makesToWarm: 8,
      makesToHot: 12,
      makesToOnFire: 999, // Almost impossible
      missesToCold: 6,
      missesToIceCold: 10
    };
  }
}

// Initialize a player's hot/cold state at game start
export function initializeHotColdState(): PlayerHotColdState {
  return {
    current_state: 'normal',
    consecutive_makes: 0,
    consecutive_misses: 0,
    modifier: 0
  };
}

// Update player's hot/cold state after a shot attempt
export function updateHotColdState(
  player: SimPlayer,
  shotMade: boolean
): PlayerHotColdState {
  const streakiness = player.attributes.streakiness || 50;
  const config = getTransitionConfig(streakiness);
  const currentState = player.hot_cold_state;

  let newConsecutiveMakes = shotMade ? currentState.consecutive_makes + 1 : 0;
  let newConsecutiveMisses = shotMade ? 0 : currentState.consecutive_misses + 1;
  let newState: HotColdState = currentState.current_state;

  // Very low streakiness players stay in normal state 95% of the time
  if (streakiness < 30) {
    // Only extreme streaks affect them
    if (newConsecutiveMakes >= config.makesToHot) {
      newState = 'warm'; // Max they can reach
    } else if (newConsecutiveMisses >= config.missesToCold) {
      newState = 'cold'; // Max cold they can get
    } else {
      newState = 'normal';
    }
    return {
      current_state: newState,
      consecutive_makes: newConsecutiveMakes,
      consecutive_misses: newConsecutiveMisses,
      modifier: HOT_COLD_MODIFIERS[newState]
    };
  }

  // Determine new state based on consecutive makes/misses
  if (shotMade) {
    // Moving UP the heat ladder
    switch (currentState.current_state) {
      case 'ice_cold':
        // Takes a few makes to get out of ice cold
        if (newConsecutiveMakes >= 2) {
          newState = 'cold';
          newConsecutiveMakes = 0; // Reset for next transition
        }
        break;
      case 'cold':
        if (newConsecutiveMakes >= 2) {
          newState = 'normal';
          newConsecutiveMakes = 0;
        }
        break;
      case 'normal':
        if (newConsecutiveMakes >= config.makesToWarm) {
          newState = 'warm';
        }
        break;
      case 'warm':
        if (newConsecutiveMakes >= config.makesToHot) {
          newState = 'hot';
        }
        break;
      case 'hot':
        if (newConsecutiveMakes >= config.makesToOnFire) {
          newState = 'on_fire';
        }
        break;
      case 'on_fire':
        // Already at max - stay on fire
        break;
    }
  } else {
    // Moving DOWN the heat ladder
    switch (currentState.current_state) {
      case 'on_fire':
        // One miss breaks the fire - dramatic!
        newState = 'hot';
        break;
      case 'hot':
        if (newConsecutiveMisses >= 2) {
          newState = 'warm';
        }
        break;
      case 'warm':
        if (newConsecutiveMisses >= 2) {
          newState = 'normal';
          newConsecutiveMisses = 0;
        }
        break;
      case 'normal':
        if (newConsecutiveMisses >= config.missesToCold) {
          newState = 'cold';
        }
        break;
      case 'cold':
        if (newConsecutiveMisses >= config.missesToIceCold) {
          newState = 'ice_cold';
        }
        break;
      case 'ice_cold':
        // Already at minimum - stay ice cold
        break;
    }
  }

  // If state changed, reset the appropriate counter
  if (newState !== currentState.current_state) {
    if (isHeatingUp(currentState.current_state, newState)) {
      // When heating up after a make, keep the makes counter
    } else if (isCoolingDown(currentState.current_state, newState)) {
      // When cooling down after a miss, keep the misses counter
    }
  }

  return {
    current_state: newState,
    consecutive_makes: newConsecutiveMakes,
    consecutive_misses: newConsecutiveMisses,
    modifier: HOT_COLD_MODIFIERS[newState]
  };
}

// Helper to check if player is heating up
function isHeatingUp(from: HotColdState, to: HotColdState): boolean {
  const order: HotColdState[] = ['ice_cold', 'cold', 'normal', 'warm', 'hot', 'on_fire'];
  return order.indexOf(to) > order.indexOf(from);
}

// Helper to check if player is cooling down
function isCoolingDown(from: HotColdState, to: HotColdState): boolean {
  const order: HotColdState[] = ['ice_cold', 'cold', 'normal', 'warm', 'hot', 'on_fire'];
  return order.indexOf(to) < order.indexOf(from);
}

// Get the shooting modifier for a player's current hot/cold state
export function getHotColdModifier(player: SimPlayer): number {
  return player.hot_cold_state?.modifier || 0;
}

// Get a description of the player's current state for play-by-play
export function getHotColdDescription(state: HotColdState): string {
  switch (state) {
    case 'on_fire':
      return "ON FIRE! 🔥";
    case 'hot':
      return "heating up";
    case 'warm':
      return "feeling it";
    case 'normal':
      return "";
    case 'cold':
      return "struggling";
    case 'ice_cold':
      return "ice cold ❄️";
    default:
      return "";
  }
}

// Check if player has a notable hot/cold state (for UI/commentary)
export function hasNotableState(state: HotColdState): boolean {
  return state !== 'normal';
}
