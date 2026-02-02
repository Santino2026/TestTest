import { v4 as uuidv4 } from 'uuid';
import {
  SimPlayer,
  PossessionContext,
  PossessionResult,
  Play,
  ShotType,
  SHOT_CLOCK
} from './types';
import {
  executeShot,
  selectShotType,
  calculateShotDistance,
  determineContestLevel
} from './shots';
import { updateHotColdState } from './hotcold';

// Import from sub-modules
import { selectBallHandler, getMatchupDefender } from './possession/ballHandling';
import { calculateActionProbabilities, selectAction } from './possession/actions';
import { executePass, checkDribbleSteal } from './possession/passing';
import { simulateRebound } from './possession/rebounding';
import { simulateFreeThrows } from './possession/freeThrows';
import { generateDescription, createReboundPlay, createTurnoverPlay } from './possession/playGeneration';

export function simulatePossession(context: PossessionContext): PossessionResult {
  const plays: Play[] = [];
  let shotClock = context.shot_clock;
  let ballHandler = selectBallHandler(context.players_on_court);
  let passCount = 0;
  let lastPasser: SimPlayer | null = null; // Track passer for assists
  let iteration = 0;

  // Simulate inbound/setup pass for assist tracking
  // NBA has ~25 assists per team per game, with ~45 made field goals = ~55% assisted
  if (Math.random() < 0.65) {
    // PG most likely to make entry pass, but others can too
    const pg = context.players_on_court.find(p => p.position === 'PG');
    const sg = context.players_on_court.find(p => p.position === 'SG');
    if (ballHandler.position !== 'PG' && pg && Math.random() < 0.7) {
      lastPasser = pg;
      passCount = 1;
    } else if (ballHandler.position !== 'SG' && sg && Math.random() < 0.4) {
      lastPasser = sg;
      passCount = 1;
    }
  }

  while (shotClock > 0) {
    if (!ballHandler || !ballHandler.id || !ballHandler.attributes) {
      ballHandler = selectBallHandler(context.players_on_court);
      if (!ballHandler) {
        return { plays, points_scored: 0, time_elapsed: SHOT_CLOCK - shotClock, possession_ended: true, ending: 'turnover' };
      }
    }

    if (iteration === 0) {
      shotClock -= Math.floor(Math.random() * 3) + 2; // 2-4s first action (NBA pace ~100 possessions)
    } else {
      shotClock -= 1;
    }
    iteration++;
    if (shotClock <= 0) {
      plays.push(createTurnoverPlay(ballHandler, context, context.game_clock - SHOT_CLOCK, 'Shot clock violation'));
      return { plays, points_scored: 0, time_elapsed: SHOT_CLOCK, possession_ended: true, ending: 'shot_clock_violation' };
    }

    const action = selectAction(calculateActionProbabilities(ballHandler, context, shotClock));

    switch (action) {
      case 'shoot': {
        const distance = calculateShotDistance(ballHandler, action);
        const shotType = selectShotType(ballHandler, distance, shotClock, false);
        const defender = getMatchupDefender(ballHandler, context.defenders);
        const contestLevel = determineContestLevel(ballHandler, defender, shotType, context.is_fast_break);
        const timeUsed = SHOT_CLOCK - shotClock;

        // Check for block BEFORE shot - interior shots have much higher block rate
        // NBA averages ~5 blocks per team per game on ~85 shots = ~6% overall
        // But blocks mostly happen on interior shots (within 10 feet)
        const isInteriorShot = distance < 10;
        const blockBaseChance = isInteriorShot ? 0.07 : 0.01; // 7% base for interior, 1% for perimeter
        const blockerBonus = (defender.attributes.block / 99) * (isInteriorShot ? 0.06 : 0.01);
        const shooterPenalty = (ballHandler.attributes.inside_scoring / 99) * 0.03; // Good finishers avoid blocks
        const blockChance = blockBaseChance + blockerBonus - shooterPenalty;

        if (Math.random() < blockChance) {
          plays.push({
            id: uuidv4(),
            type: 'block',
            quarter: context.quarter,
            game_clock: context.game_clock - timeUsed,
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            secondary_player_id: defender.id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('block', ballHandler, defender)
          });

          // After block, ball often goes out or defense recovers
          const reboundResult = simulateRebound(context.players_on_court, context.defenders);
          plays.push(createReboundPlay(reboundResult, context, context.game_clock - timeUsed - 1));

          if (reboundResult.offensive) {
            shotClock = 14;
            ballHandler = reboundResult.rebounder;
            continue;
          }

          return { plays, points_scored: 0, time_elapsed: timeUsed + 2, possession_ended: true, ending: 'missed_shot' };
        }

        const shotResult = executeShot({
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
        });

        ballHandler.hot_cold_state = updateHotColdState(ballHandler, shotResult.made);

        plays.push({
          id: uuidv4(),
          type: shotResult.made ? 'made_shot' : 'missed_shot',
          quarter: context.quarter,
          game_clock: context.game_clock - timeUsed,
          shot_clock: shotClock,
          primary_player_id: ballHandler.id,
          secondary_player_id: shotResult.made && passCount > 0 ? lastPasser?.id : undefined,
          team_id: context.team.id,
          points: shotResult.points,
          home_score: 0,
          away_score: 0,
          shot_type: shotType,
          shot_made: shotResult.made,
          shot_distance: distance,
          shot_contested: shotResult.contested,
          description: generateDescription(shotResult.made ? 'made_shot' : 'missed_shot', ballHandler, undefined, shotType)
        });

        if (shotResult.made) {
          return { plays, points_scored: shotResult.points, time_elapsed: timeUsed + 2, possession_ended: true, ending: 'made_shot' };
        }

        const reboundResult = simulateRebound(context.players_on_court, context.defenders);
        plays.push(createReboundPlay(reboundResult, context, context.game_clock - timeUsed - 2));

        if (reboundResult.offensive) {
          shotClock = 14;
          ballHandler = reboundResult.rebounder;
          continue;
        }

        return { plays, points_scored: 0, time_elapsed: timeUsed + 3, possession_ended: true, ending: 'missed_shot', rebounder_id: reboundResult.rebounder.id, is_offensive_rebound: false };
      }

      case 'pass': {
        if (!ballHandler || !ballHandler.id) {
          ballHandler = selectBallHandler(context.players_on_court);
          if (!ballHandler) {
            return { plays, points_scored: 0, time_elapsed: SHOT_CLOCK - shotClock, possession_ended: true, ending: 'turnover' };
          }
        }

        const teammates = context.players_on_court.filter(p => p && p.id && p.id !== ballHandler.id);
        if (teammates.length === 0) {
          shotClock -= 2;
          continue;
        }

        const receiver = teammates[Math.floor(Math.random() * teammates.length)];
        const passResult = executePass(ballHandler, context.defenders);
        const timeUsed = SHOT_CLOCK - shotClock;

        if (passResult.stolen) {
          plays.push({
            id: uuidv4(),
            type: 'steal',
            quarter: context.quarter,
            game_clock: context.game_clock - timeUsed,
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            secondary_player_id: passResult.stealer_id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('steal', ballHandler, context.defenders.find(d => d.id === passResult.stealer_id))
          });
          return { plays, points_scored: 0, time_elapsed: timeUsed + 1, possession_ended: true, ending: 'turnover' };
        }

        if (!passResult.success) {
          plays.push({
            id: uuidv4(),
            type: 'turnover',
            quarter: context.quarter,
            game_clock: context.game_clock - timeUsed,
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            team_id: context.team.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('turnover', ballHandler)
          });
          return { plays, points_scored: 0, time_elapsed: timeUsed + 1, possession_ended: true, ending: 'turnover' };
        }

        lastPasser = ballHandler; // Track passer for potential assist
        ballHandler = receiver;
        passCount++;
        shotClock -= Math.floor(Math.random() * 3) + 2;

        if (passCount >= 6) {
          shotClock = Math.min(shotClock, 4);
        }
        break;
      }

      case 'drive': {
        const defender = getMatchupDefender(ballHandler, context.defenders);
        const timeUsed = SHOT_CLOCK - shotClock;

        // Check for steal during drive
        const driveSteal = checkDribbleSteal(ballHandler, context.defenders);
        if (driveSteal.stolen) {
          plays.push({
            id: uuidv4(),
            type: 'steal',
            quarter: context.quarter,
            game_clock: context.game_clock - timeUsed,
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            secondary_player_id: driveSteal.stealer_id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('steal', ballHandler, context.defenders.find(d => d.id === driveSteal.stealer_id))
          });
          return { plays, points_scored: 0, time_elapsed: timeUsed + 1, possession_ended: true, ending: 'turnover' };
        }

        const drawFoulChance = ((ballHandler.attributes.draw_foul || 50) / 99) * 0.15;

        if (Math.random() < drawFoulChance) {
          plays.push({
            id: uuidv4(),
            type: 'foul',
            quarter: context.quarter,
            game_clock: context.game_clock - timeUsed,
            shot_clock: shotClock,
            primary_player_id: defender.id,
            secondary_player_id: ballHandler.id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('foul', defender)
          });

          const ftResult = simulateFreeThrows(ballHandler, 2, context);
          plays.push(...ftResult.plays);
          return { plays, points_scored: ftResult.points, time_elapsed: timeUsed + 4, possession_ended: true, ending: 'foul' };
        }

        const shotType: ShotType = ballHandler.attributes.vertical > 70 && Math.random() < 0.4 ? 'dunk' : 'layup';

        // Drives to rim have high block potential - find best rim protector
        const rimProtector = context.defenders.reduce((best, d) =>
          d.attributes.block > best.attributes.block ? d : best
        );
        const blockBaseChance = 0.08; // 8% base for drives to rim
        const blockerBonus = (rimProtector.attributes.block / 99) * 0.07;
        const finisherPenalty = (ballHandler.attributes.inside_scoring / 99) * 0.04;
        const driveBlockChance = blockBaseChance + blockerBonus - finisherPenalty;

        if (Math.random() < driveBlockChance) {
          plays.push({
            id: uuidv4(),
            type: 'block',
            quarter: context.quarter,
            game_clock: context.game_clock - timeUsed,
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            secondary_player_id: rimProtector.id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('block', ballHandler, rimProtector)
          });

          const reboundResult = simulateRebound(context.players_on_court, context.defenders);
          plays.push(createReboundPlay(reboundResult, context, context.game_clock - timeUsed - 1));

          if (reboundResult.offensive) {
            shotClock = 14;
            ballHandler = reboundResult.rebounder;
            continue;
          }

          return { plays, points_scored: 0, time_elapsed: timeUsed + 2, possession_ended: true, ending: 'missed_shot' };
        }

        const contestLevel = determineContestLevel(ballHandler, defender, shotType, context.is_fast_break);

        const shotResult = executeShot({
          shooter: ballHandler,
          defender,
          shot_type: shotType,
          shot_distance: 3,
          shot_clock: shotClock - 2,
          game_clock: context.game_clock - timeUsed - 2,
          score_differential: context.score_differential,
          quarter: context.quarter,
          is_fast_break: context.is_fast_break,
          is_contested: contestLevel !== 'open',
          contest_level: contestLevel,
          shooter_fatigue: ballHandler.fatigue,
          consecutive_minutes: ballHandler.minutes_played
        });

        ballHandler.hot_cold_state = updateHotColdState(ballHandler, shotResult.made);

        plays.push({
          id: uuidv4(),
          type: shotResult.made ? 'made_shot' : 'missed_shot',
          quarter: context.quarter,
          game_clock: context.game_clock - timeUsed - 2,
          shot_clock: shotClock - 2,
          primary_player_id: ballHandler.id,
          secondary_player_id: shotResult.made && passCount > 0 ? lastPasser?.id : undefined,
          team_id: context.team.id,
          points: shotResult.points,
          home_score: 0,
          away_score: 0,
          shot_type: shotType,
          shot_made: shotResult.made,
          shot_distance: 3,
          shot_contested: shotResult.contested,
          description: generateDescription(shotResult.made ? 'made_shot' : 'missed_shot', ballHandler, undefined, shotType)
        });

        if (shotResult.made) {
          return { plays, points_scored: shotResult.points, time_elapsed: timeUsed + 4, possession_ended: true, ending: 'made_shot' };
        }

        const reboundResult = simulateRebound(context.players_on_court, context.defenders);
        plays.push(createReboundPlay(reboundResult, context, context.game_clock - timeUsed - 4));

        if (reboundResult.offensive) {
          shotClock = 14;
          ballHandler = reboundResult.rebounder;
          continue;
        }

        return { plays, points_scored: 0, time_elapsed: timeUsed + 5, possession_ended: true, ending: 'missed_shot' };
      }

      case 'iso':
      case 'post_up':
      case 'pick_and_roll': {
        // Check for steal during dribble moves
        const dribbleSteal = checkDribbleSteal(ballHandler, context.defenders);
        if (dribbleSteal.stolen) {
          const timeUsed = SHOT_CLOCK - shotClock;
          plays.push({
            id: uuidv4(),
            type: 'steal',
            quarter: context.quarter,
            game_clock: context.game_clock - timeUsed,
            shot_clock: shotClock,
            primary_player_id: ballHandler.id,
            secondary_player_id: dribbleSteal.stealer_id,
            team_id: context.opponent.id,
            points: 0,
            home_score: 0,
            away_score: 0,
            description: generateDescription('steal', ballHandler, context.defenders.find(d => d.id === dribbleSteal.stealer_id))
          });
          return { plays, points_scored: 0, time_elapsed: timeUsed + 1, possession_ended: true, ending: 'turnover' };
        }

        shotClock -= Math.floor(Math.random() * 3) + 3;

        if (shotClock <= 0) {
          plays.push(createTurnoverPlay(ballHandler, context, context.game_clock - SHOT_CLOCK, 'Shot clock violation'));
          return { plays, points_scored: 0, time_elapsed: SHOT_CLOCK, possession_ended: true, ending: 'shot_clock_violation' };
        }

        // Pass-out after play creation (enables assists)
        const teammates = context.players_on_court.filter(p => p.id !== ballHandler.id);
        if (teammates.length > 0 && Math.random() < 0.5) {
          lastPasser = ballHandler;
          ballHandler = teammates[Math.floor(Math.random() * teammates.length)];
          passCount++;
        }
        break;
      }
    }
  }

  plays.push(createTurnoverPlay(ballHandler, context, context.game_clock - SHOT_CLOCK, 'Shot clock violation'));
  return { plays, points_scored: 0, time_elapsed: SHOT_CLOCK, possession_ended: true, ending: 'shot_clock_violation' };
}
