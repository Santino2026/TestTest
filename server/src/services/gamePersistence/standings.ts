import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { getTeamsInfo } from '../../db/queries';
import { GameResult, DbConnection } from './types';

interface StandingUpdate {
  won: boolean;
  isHome: boolean;
  pointsFor: number;
  pointsAgainst: number;
  conferenceGame: number;
  divisionGame: number;
}

export async function updateStandingsAfterGame(
  result: GameResult,
  seasonId: string,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;

  const teamsInfo = await getTeamsInfo([result.home_team_id, result.away_team_id], client);
  const homeInfo = teamsInfo.get(result.home_team_id);
  const awayInfo = teamsInfo.get(result.away_team_id);

  const homeWon = result.winner_id === result.home_team_id;
  const sameConference = homeInfo?.conference === awayInfo?.conference ? 1 : 0;
  const sameDivision = homeInfo?.division === awayInfo?.division ? 1 : 0;

  await updateTeamStanding(db, seasonId, result.home_team_id, {
    won: homeWon,
    isHome: true,
    pointsFor: result.home_score,
    pointsAgainst: result.away_score,
    conferenceGame: sameConference,
    divisionGame: sameDivision
  });

  await updateTeamStanding(db, seasonId, result.away_team_id, {
    won: !homeWon,
    isHome: false,
    pointsFor: result.away_score,
    pointsAgainst: result.home_score,
    conferenceGame: sameConference,
    divisionGame: sameDivision
  });
}

async function updateTeamStanding(
  db: DbConnection,
  seasonId: string,
  teamId: string,
  update: StandingUpdate
): Promise<void> {
  const { won, isHome, pointsFor, pointsAgainst, conferenceGame, divisionGame } = update;

  if (won) {
    const locationField = isHome ? 'home_wins' : 'away_wins';
    await db.query(
      `UPDATE standings SET
         wins = wins + 1,
         ${locationField} = COALESCE(${locationField}, 0) + 1,
         points_for = COALESCE(points_for, 0) + $3,
         points_against = COALESCE(points_against, 0) + $4,
         conference_wins = conference_wins + $5,
         division_wins = division_wins + $6
       WHERE season_id = $1 AND team_id = $2`,
      [seasonId, teamId, pointsFor, pointsAgainst, conferenceGame, divisionGame]
    );
  } else {
    const locationField = isHome ? 'home_losses' : 'away_losses';
    await db.query(
      `UPDATE standings SET
         losses = losses + 1,
         ${locationField} = COALESCE(${locationField}, 0) + 1,
         points_for = COALESCE(points_for, 0) + $3,
         points_against = COALESCE(points_against, 0) + $4,
         conference_losses = conference_losses + $5,
         division_losses = division_losses + $6
       WHERE season_id = $1 AND team_id = $2`,
      [seasonId, teamId, pointsFor, pointsAgainst, conferenceGame, divisionGame]
    );
  }
}
