import { v4 as uuidv4 } from 'uuid';
import { SimPlayer, PossessionContext, Play, PlayType, ShotType, SHOT_CLOCK } from '../types';

const SHOT_DESCRIPTIONS: Record<ShotType, string> = {
  dunk: 'throws down a dunk',
  layup: 'makes a layup',
  floater: 'floats one in',
  hook_shot: 'hits a hook shot',
  post_fadeaway: 'nails a fadeaway',
  mid_range_pull_up: 'drills a pull-up jumper',
  mid_range_catch_shoot: 'knocks down the mid-range shot',
  three_point_catch_shoot: 'drains a three',
  three_point_pull_up: 'pulls up from three',
  three_point_step_back: 'hits a step-back three',
  three_point_corner: 'buries a corner three',
  three_point_deep: 'drains a deep three',
  free_throw: 'makes the free throw',
  alley_oop: 'finishes the alley-oop',
  putback: 'puts it back in',
  tip_in: 'tips it in'
};

function formatPlayerName(player: SimPlayer): string {
  return `${player.first_name.charAt(0)}. ${player.last_name}`;
}

export function generateDescription(
  playType: PlayType,
  primaryPlayer: SimPlayer,
  secondaryPlayer?: SimPlayer,
  shotType?: ShotType
): string {
  const name = formatPlayerName(primaryPlayer);
  const secondName = secondaryPlayer ? formatPlayerName(secondaryPlayer) : null;

  switch (playType) {
    case 'made_shot': {
      const shotDesc = SHOT_DESCRIPTIONS[shotType!] || 'scores';
      return secondName ? `${name} ${shotDesc} (assist: ${secondName})` : `${name} ${shotDesc}`;
    }
    case 'missed_shot':
      return `${name} misses ${SHOT_DESCRIPTIONS[shotType!] || 'the shot'}`;
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

export function createReboundPlay(
  reboundResult: { rebounder: SimPlayer; offensive: boolean },
  context: PossessionContext,
  gameClock: number
): Play {
  const playType: PlayType = reboundResult.offensive ? 'offensive_rebound' : 'defensive_rebound';
  return {
    id: uuidv4(),
    type: playType,
    quarter: context.quarter,
    game_clock: gameClock,
    shot_clock: reboundResult.offensive ? 14 : SHOT_CLOCK,
    primary_player_id: reboundResult.rebounder.id,
    team_id: reboundResult.offensive ? context.team.id : context.opponent.id,
    points: 0,
    home_score: 0,
    away_score: 0,
    description: generateDescription(playType, reboundResult.rebounder)
  };
}

export function createTurnoverPlay(
  ballHandler: SimPlayer,
  context: PossessionContext,
  gameClock: number,
  description: string
): Play {
  return {
    id: uuidv4(),
    type: 'turnover',
    quarter: context.quarter,
    game_clock: gameClock,
    shot_clock: 0,
    primary_player_id: ballHandler.id,
    team_id: context.team.id,
    points: 0,
    home_score: 0,
    away_score: 0,
    description
  };
}
