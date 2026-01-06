// Possession Simulation Engine
// Handles the flow of a single possession

import { v4 as uuidv4 } from 'uuid';
import {
  SimPlayer,
  SimTeam,
  PossessionContext,
  PossessionResult,
  Play,
  PlayType,
  ShotType,
  ShotContext,
  ActionType,
  SHOT_CLOCK,
  POSITION_REBOUND_MODS
} from './types';
import {
  executeShot,
  selectShotType,
  calculateShotDistance,
  determineContestLevel
} from './shots';
import { updateHotColdState } from './hotcold';

// Simulate free throw attempts
function simulateFreeThrows(
  shooter: SimPlayer,
  numAttempts: number,
  context: PossessionContext
): { plays: Play[]; points: number } {
  const plays: Play[] = [];
  let points = 0;

  // Base free throw percentage from player attribute (0-99 -> 0-1 scale)
  const baseFTPct = shooter.attributes.free_throw / 100;

  // Apply fatigue modifier (slight reduction when tired)
  const fatigueModifier = shooter.fatigue > 70 ? 0.95 : (shooter.fatigue > 50 ? 0.98 : 1.0);

  for (let i = 0; i < numAttempts; i++) {
    const ftChance = baseFTPct * fatigueModifier;
    const made = Math.random() < ftChance;

    const ftPlay: Play = {
      id: uuidv4(),
      type: made ? 'free_throw_made' : 'free_throw_missed',
      quarter: context.quarter,
      game_clock: context.game_clock - 2 - i, // Each FT takes ~1 second
      shot_clock: 0, // No shot clock on free throws
      primary_player_id: shooter.id,
      team_id: context.team.id,
      points: made ? 1 : 0,
      home_score: 0, // Updated by engine
      away_score: 0, // Updated by engine
      description: made
        ? `${shooter.first_name} ${shooter.last_name} makes free throw ${i + 1} of ${numAttempts}`
        : `${shooter.first_name} ${shooter.last_name} misses free throw ${i + 1} of ${numAttempts}`
    };

    plays.push(ftPlay);
    if (made) points += 1;
  }

  return { plays, points };
}

// Select primary ball handler based on position and skills
function selectBallHandler(players: SimPlayer[]): SimPlayer {
  // Guard against empty array
  if (!players || players.length === 0) {
    throw new Error('selectBallHandler called with no players on court');
  }

  // Weight by position and ball handling
  const weights = players.map(p => {
    let weight = p.attributes?.ball_handling || 50;

    // Position bonuses
    switch (p.position) {
      case 'PG': weight *= 1.5; break;
      case 'SG': weight *= 1.2; break;
      case 'SF': weight *= 1.0; break;
      case 'PF': weight *= 0.7; break;
      case 'C': weight *= 0.5; break;
    }

    return weight;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;

  for (let i = 0; i < players.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return players[i];
  }

  return players[0];
}

// Get the best defender for a player
function getMatchupDefender(
  offensive_player: SimPlayer,
  defenders: SimPlayer[]
): SimPlayer {
  // Try to find positional matchup first
  const positionalMatch = defenders.find(d => d.position === offensive_player.position);
  if (positionalMatch) return positionalMatch;

  // Otherwise return closest position
  const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
  const offIdx = positionOrder.indexOf(offensive_player.position);

  return defenders.reduce((best, d) => {
    const dIdx = positionOrder.indexOf(d.position);
    const bestIdx = positionOrder.indexOf(best.position);
    return Math.abs(dIdx - offIdx) < Math.abs(bestIdx - offIdx) ? d : best;
  });
}

// Calculate action probabilities based on context
function calculateActionProbabilities(
  ballHandler: SimPlayer,
  context: PossessionContext,
  shotClock: number
): Record<ActionType, number> {
  const attrs = ballHandler.attributes;

  // Base probabilities
  let probs: Record<ActionType, number> = {
    shoot: 0.25,
    pass: 0.35,
    drive: 0.20,
    post_up: 0.05,
    pick_and_roll: 0.10,
    iso: 0.05
  };

  // Adjust based on shot clock
  if (shotClock <= 6) {
    probs.shoot *= 2.0;
    probs.pass *= 0.5;
    probs.drive *= 1.5;
  } else if (shotClock <= 14) {
    probs.shoot *= 1.3;
    probs.drive *= 1.2;
  }

  // Adjust based on player skills
  const shootingAbility = (attrs.three_point + attrs.mid_range + attrs.inside_scoring) / 3;
  probs.shoot *= (shootingAbility / 70);

  // Good passers pass more
  probs.pass *= ((attrs.passing || 70) / 70);

  // Good ball handlers drive more
  probs.drive *= (attrs.ball_handling / 70);

  // Bigs post up more
  if (ballHandler.position === 'C' || ballHandler.position === 'PF') {
    probs.post_up *= 3;
  }

  // Fast break adjustments
  if (context.is_fast_break) {
    probs.shoot *= 1.5;
    probs.drive *= 1.5;
    probs.pick_and_roll *= 0.3;
    probs.iso *= 0.3;
  }

  // Normalize
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(probs) as ActionType[]) {
    probs[key] /= total;
  }

  return probs;
}

// Select an action based on weighted probabilities
function selectAction(probs: Record<ActionType, number>): ActionType {
  let roll = Math.random();
  for (const [action, prob] of Object.entries(probs)) {
    roll -= prob;
    if (roll <= 0) return action as ActionType;
  }
  return 'pass';
}

// Execute a pass attempt
function executePass(
  passer: SimPlayer,
  receiver: SimPlayer,
  defenders: SimPlayer[]
): { success: boolean; stolen: boolean; stealer_id?: string } {
  // Base pass success rate
  let successRate = ((passer.attributes.passing || 70) / 99) * 0.95;

  // Find defender near passing lane
  const defenderIdx = Math.floor(Math.random() * defenders.length);
  const defender = defenders[defenderIdx];

  // Steal chance
  const stealChance = (defender.attributes.steal / 99) * 0.08;

  if (Math.random() < stealChance) {
    return { success: false, stolen: true, stealer_id: defender.id };
  }

  // Pass completion
  if (Math.random() < successRate) {
    return { success: true, stolen: false };
  }

  return { success: false, stolen: false };
}

// Simulate a rebound
function simulateRebound(
  offensivePlayers: SimPlayer[],
  defensivePlayers: SimPlayer[],
  shotLocation: number
): { rebounder: SimPlayer; offensive: boolean } {
  const candidates: { player: SimPlayer; chance: number; offensive: boolean }[] = [];

  // Calculate chances for each player
  for (const player of offensivePlayers) {
    let chance = calculateReboundChance(player, true);
    chance *= 0.25; // Offensive rebounds are harder
    candidates.push({ player, chance, offensive: true });
  }

  for (const player of defensivePlayers) {
    const chance = calculateReboundChance(player, false);
    candidates.push({ player, chance, offensive: false });
  }

  // Weighted selection
  const total = candidates.reduce((sum, c) => sum + c.chance, 0);
  let roll = Math.random() * total;

  for (const candidate of candidates) {
    roll -= candidate.chance;
    if (roll <= 0) {
      return { rebounder: candidate.player, offensive: candidate.offensive };
    }
  }

  // Fallback to first defensive player
  return { rebounder: defensivePlayers[0], offensive: false };
}

function calculateReboundChance(player: SimPlayer, offensive: boolean): number {
  let chance = 0;

  // Base from attributes
  const rebAttr = offensive
    ? player.attributes.offensive_rebound
    : player.attributes.defensive_rebound;

  chance += rebAttr * 0.3;
  chance += player.attributes.vertical * 0.2;
  chance += player.attributes.strength * 0.2;
  chance += player.attributes.basketball_iq * 0.1;

  // Position modifier
  const posMod = POSITION_REBOUND_MODS[player.position] || 1;
  chance *= posMod;

  // Height advantage
  chance *= (player.height_inches / 78);

  // Check for Glass Cleaner trait
  const hasGlassCleaner = player.traits.some(t => t.name === 'Glass Cleaner');
  if (hasGlassCleaner) {
    chance *= 1.3;
  }

  return chance;
}

// Generate play description
function generateDescription(
  playType: PlayType,
  primaryPlayer: SimPlayer,
  secondaryPlayer?: SimPlayer,
  shotType?: ShotType,
  shotMade?: boolean
): string {
  const name = `${primaryPlayer.first_name.charAt(0)}. ${primaryPlayer.last_name}`;
  const secondName = secondaryPlayer
    ? `${secondaryPlayer.first_name.charAt(0)}. ${secondaryPlayer.last_name}`
    : null;

  switch (playType) {
    case 'made_shot':
      const shotDesc = getShotDescription(shotType!);
      if (secondName) {
        return `${name} ${shotDesc} (assist: ${secondName})`;
      }
      return `${name} ${shotDesc}`;

    case 'missed_shot':
      return `${name} misses ${getShotDescription(shotType!)}`;

    case 'offensive_rebound':
      return `${name} grabs the offensive rebound`;

    case 'defensive_rebound':
      return `${name} grabs the defensive rebound`;

    case 'steal':
      return `${secondName} steals the ball from ${name}`;

    case 'turnover':
      return `${name} turns the ball over`;

    case 'block':
      return `${secondName} blocks ${name}'s shot`;

    case 'foul':
      return `Foul on ${name}`;

    default:
      return `${playType}`;
  }
}

function getShotDescription(shotType: ShotType): string {
  switch (shotType) {
    case 'dunk': return 'throws down a dunk';
    case 'layup': return 'makes a layup';
    case 'floater': return 'floats one in';
    case 'hook_shot': return 'hits a hook shot';
    case 'post_fadeaway': return 'nails a fadeaway';
    case 'mid_range_pull_up': return 'drills a pull-up jumper';
    case 'mid_range_catch_shoot': return 'knocks down the mid-range shot';
    case 'three_point_catch_shoot': return 'drains a three';
    case 'three_point_pull_up': return 'pulls up from three';
    case 'three_point_step_back': return 'hits a step-back three';
    case 'three_point_corner': return 'buries a corner three';
    case 'three_point_deep': return 'drains a deep three';
    case 'alley_oop': return 'finishes the alley-oop';
    case 'putback': return 'puts it back in';
    case 'tip_in': return 'tips it in';
    default: return 'scores';
  }
}

// Main possession simulation
export function simulatePossession(context: PossessionContext): PossessionResult {
  const plays: Play[] = [];
  let shotClock = context.shot_clock;
  let ballHandler = selectBallHandler(context.players_on_court);
  let passCount = 0;
  const maxPasses = 6;

  while (shotClock > 0) {
    // 1. Calculate action probabilities
    const actionProbs = calculateActionProbabilities(ballHandler, context, shotClock);

    // 2. Select action
    const action = selectAction(actionProbs);

    // 3. Execute action
    switch (action) {
      case 'shoot': {
        const distance = calculateShotDistance(ballHandler, action);
        const shotType = selectShotType(ballHandler, distance, shotClock, false);
        const defender = getMatchupDefender(ballHandler, context.defenders);
        const contestLevel = determineContestLevel(ballHandler, defender, shotType, context.is_fast_break);

        const shotContext: ShotContext = {
          shooter: ballHandler,
          defender,
          shot_type: shotType,
          shot_distance: distance,
          shot_clock: shotClock,
          game_clock: context.game_clock,
          score_differential: context.score_differential,
          quarter: context.quarter,
          is_fast_break: context.is_fast_break,
          is_contested: contestLevel !== 'open',
          contest_level: contestLevel,
          shooter_fatigue: ballHandler.fatigue,
          consecutive_minutes: ballHandler.minutes_played
        };

        const shotResult = executeShot(shotContext);

        // Update player's hot/cold state after shot (GDD Section 4.2 - Streakiness)
        ballHandler.hot_cold_state = updateHotColdState(ballHandler, shotResult.made);

        // Check for block (on missed shots only)
        if (!shotResult.made && Math.random() < (defender.attributes.block / 99) * 0.08) {
          const blockPlay: Play = {
            id: uuidv4(),
            type: 'block',
            quarter: context.quarter,
            game_clock: context.game_clock - (SHOT_CLOCK - shotClock),
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            secondary_player_id: defender.id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('block', ballHandler, defender)
          };
          plays.push(blockPlay);

          return {
            plays,
            points_scored: 0,
            time_elapsed: SHOT_CLOCK - shotClock + 2,
            possession_ended: true,
            ending: 'missed_shot'
          };
        }

        // Record shot
        const shotPlay: Play = {
          id: uuidv4(),
          type: shotResult.made ? 'made_shot' : 'missed_shot',
          quarter: context.quarter,
          game_clock: context.game_clock - (SHOT_CLOCK - shotClock),
          shot_clock: shotClock,
          primary_player_id: ballHandler.id,
          team_id: context.team.id,
          points: shotResult.points,
          home_score: 0,
          away_score: 0,
          shot_type: shotType,
          shot_made: shotResult.made,
          shot_distance: distance,
          shot_contested: shotResult.contested,
          description: generateDescription(
            shotResult.made ? 'made_shot' : 'missed_shot',
            ballHandler,
            undefined,
            shotType,
            shotResult.made
          )
        };
        plays.push(shotPlay);

        if (shotResult.made) {
          return {
            plays,
            points_scored: shotResult.points,
            time_elapsed: SHOT_CLOCK - shotClock + 2,
            possession_ended: true,
            ending: 'made_shot'
          };
        }

        // Missed shot - simulate rebound
        const reboundResult = simulateRebound(
          context.players_on_court,
          context.defenders,
          distance
        );

        const reboundPlay: Play = {
          id: uuidv4(),
          type: reboundResult.offensive ? 'offensive_rebound' : 'defensive_rebound',
          quarter: context.quarter,
          game_clock: context.game_clock - (SHOT_CLOCK - shotClock) - 2,
          shot_clock: reboundResult.offensive ? 14 : SHOT_CLOCK,
          primary_player_id: reboundResult.rebounder.id,
          team_id: reboundResult.offensive ? context.team.id : context.opponent.id,
          points: 0,
          home_score: 0,
          away_score: 0,
          description: generateDescription(
            reboundResult.offensive ? 'offensive_rebound' : 'defensive_rebound',
            reboundResult.rebounder
          )
        };
        plays.push(reboundPlay);

        if (reboundResult.offensive) {
          // Reset for new possession with offensive rebound
          shotClock = 14;
          ballHandler = reboundResult.rebounder;
          continue;
        }

        return {
          plays,
          points_scored: 0,
          time_elapsed: SHOT_CLOCK - shotClock + 3,
          possession_ended: true,
          ending: 'missed_shot',
          rebounder_id: reboundResult.rebounder.id,
          is_offensive_rebound: false
        };
      }

      case 'pass': {
        // Select random teammate
        const teammates = context.players_on_court.filter(p => p.id !== ballHandler.id);
        const receiver = teammates[Math.floor(Math.random() * teammates.length)];

        const passResult = executePass(ballHandler, receiver, context.defenders);

        if (passResult.stolen) {
          const stealPlay: Play = {
            id: uuidv4(),
            type: 'steal',
            quarter: context.quarter,
            game_clock: context.game_clock - (SHOT_CLOCK - shotClock),
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            secondary_player_id: passResult.stealer_id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('steal', ballHandler, context.defenders.find(d => d.id === passResult.stealer_id))
          };
          plays.push(stealPlay);

          return {
            plays,
            points_scored: 0,
            time_elapsed: SHOT_CLOCK - shotClock + 1,
            possession_ended: true,
            ending: 'turnover'
          };
        }

        if (!passResult.success) {
          const turnoverPlay: Play = {
            id: uuidv4(),
            type: 'turnover',
            quarter: context.quarter,
            game_clock: context.game_clock - (SHOT_CLOCK - shotClock),
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            team_id: context.team.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('turnover', ballHandler)
          };
          plays.push(turnoverPlay);

          return {
            plays,
            points_scored: 0,
            time_elapsed: SHOT_CLOCK - shotClock + 1,
            possession_ended: true,
            ending: 'turnover'
          };
        }

        // Successful pass
        ballHandler = receiver;
        passCount++;
        shotClock -= Math.floor(Math.random() * 3) + 1; // 1-3 seconds per pass

        if (passCount >= maxPasses) {
          // Force a shot after too many passes
          shotClock = Math.min(shotClock, 4);
        }
        break;
      }

      case 'drive': {
        // Drive to basket - leads to layup/dunk or foul
        const defender = getMatchupDefender(ballHandler, context.defenders);

        // Chance to draw foul (use draw_foul attribute if available)
        const drawFoulChance = (ballHandler.attributes.draw_foul || 50) / 99 * 0.15;
        if (Math.random() < drawFoulChance) {
          const foulPlay: Play = {
            id: uuidv4(),
            type: 'foul',
            quarter: context.quarter,
            game_clock: context.game_clock - (SHOT_CLOCK - shotClock),
            shot_clock: shotClock,
            primary_player_id: defender.id,
            secondary_player_id: ballHandler.id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('foul', defender)
          };
          plays.push(foulPlay);

          // Simulate 2 free throws for driving foul
          const ftResult = simulateFreeThrows(ballHandler, 2, context);
          plays.push(...ftResult.plays);

          return {
            plays,
            points_scored: ftResult.points,
            time_elapsed: SHOT_CLOCK - shotClock + 4, // Extra time for free throws
            possession_ended: true,
            ending: 'foul'
          };
        }

        // Drive leads to close shot
        const shotType: ShotType = ballHandler.attributes.vertical > 70 && Math.random() < 0.4
          ? 'dunk'
          : 'layup';

        const contestLevel = determineContestLevel(ballHandler, defender, shotType, context.is_fast_break);

        const shotContext: ShotContext = {
          shooter: ballHandler,
          defender,
          shot_type: shotType,
          shot_distance: 3,
          shot_clock: shotClock - 2,
          game_clock: context.game_clock - (SHOT_CLOCK - shotClock) - 2,
          score_differential: context.score_differential,
          quarter: context.quarter,
          is_fast_break: context.is_fast_break,
          is_contested: contestLevel !== 'open',
          contest_level: contestLevel,
          shooter_fatigue: ballHandler.fatigue,
          consecutive_minutes: ballHandler.minutes_played
        };

        const shotResult = executeShot(shotContext);

        // Update player's hot/cold state after shot (GDD Section 4.2 - Streakiness)
        ballHandler.hot_cold_state = updateHotColdState(ballHandler, shotResult.made);

        const shotPlay: Play = {
          id: uuidv4(),
          type: shotResult.made ? 'made_shot' : 'missed_shot',
          quarter: context.quarter,
          game_clock: context.game_clock - (SHOT_CLOCK - shotClock) - 2,
          shot_clock: shotClock - 2,
          primary_player_id: ballHandler.id,
          team_id: context.team.id,
          points: shotResult.points,
          home_score: 0,
          away_score: 0,
          shot_type: shotType,
          shot_made: shotResult.made,
          shot_distance: 3,
          shot_contested: shotResult.contested,
          description: generateDescription(
            shotResult.made ? 'made_shot' : 'missed_shot',
            ballHandler,
            undefined,
            shotType,
            shotResult.made
          )
        };
        plays.push(shotPlay);

        if (shotResult.made) {
          return {
            plays,
            points_scored: shotResult.points,
            time_elapsed: SHOT_CLOCK - shotClock + 4,
            possession_ended: true,
            ending: 'made_shot'
          };
        }

        // Missed - rebound
        const reboundResult = simulateRebound(
          context.players_on_court,
          context.defenders,
          3
        );

        const reboundPlay: Play = {
          id: uuidv4(),
          type: reboundResult.offensive ? 'offensive_rebound' : 'defensive_rebound',
          quarter: context.quarter,
          game_clock: context.game_clock - (SHOT_CLOCK - shotClock) - 4,
          shot_clock: reboundResult.offensive ? 14 : SHOT_CLOCK,
          primary_player_id: reboundResult.rebounder.id,
          team_id: reboundResult.offensive ? context.team.id : context.opponent.id,
          points: 0,
          home_score: 0,
          away_score: 0,
          description: generateDescription(
            reboundResult.offensive ? 'offensive_rebound' : 'defensive_rebound',
            reboundResult.rebounder
          )
        };
        plays.push(reboundPlay);

        if (reboundResult.offensive) {
          shotClock = 14;
          ballHandler = reboundResult.rebounder;
          continue;
        }

        return {
          plays,
          points_scored: 0,
          time_elapsed: SHOT_CLOCK - shotClock + 5,
          possession_ended: true,
          ending: 'missed_shot'
        };
      }

      case 'iso':
      case 'post_up':
      case 'pick_and_roll': {
        // These all use similar logic - take time then shoot
        shotClock -= Math.floor(Math.random() * 4) + 2;

        if (shotClock <= 0) {
          const turnoverPlay: Play = {
            id: uuidv4(),
            type: 'turnover',
            quarter: context.quarter,
            game_clock: context.game_clock - SHOT_CLOCK,
            shot_clock: 0,
            primary_player_id: ballHandler.id,
            team_id: context.team.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: 'Shot clock violation'
          };
          plays.push(turnoverPlay);

          return {
            plays,
            points_scored: 0,
            time_elapsed: SHOT_CLOCK,
            possession_ended: true,
            ending: 'shot_clock_violation'
          };
        }

        // Continue to next action (likely shot)
        break;
      }
    }
  }

  // Shot clock expired
  const turnoverPlay: Play = {
    id: uuidv4(),
    type: 'turnover',
    quarter: context.quarter,
    game_clock: context.game_clock - SHOT_CLOCK,
    shot_clock: 0,
    primary_player_id: ballHandler.id,
    team_id: context.team.id,
    points: 0,
    home_score: 0,
    away_score: 0,
    description: 'Shot clock violation'
  };
  plays.push(turnoverPlay);

  return {
    plays,
    points_scored: 0,
    time_elapsed: SHOT_CLOCK,
    possession_ended: true,
    ending: 'shot_clock_violation'
  };
}
