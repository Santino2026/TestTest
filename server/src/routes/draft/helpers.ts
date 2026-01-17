import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../db/transactions';
import { getDraftState } from '../../draft';

export async function createPlayerFromProspect(
  client: PoolClient,
  prospect: any,
  teamId: string,
  prospectId: string
): Promise<string> {
  const playerId = uuidv4();

  await client.query(
    `INSERT INTO players
     (id, first_name, last_name, team_id, position, archetype,
      height_inches, weight_lbs, age, jersey_number, years_pro,
      overall, potential, peak_age, durability, coachability,
      greed, ego, loyalty, leadership, motor)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
    [playerId, prospect.first_name, prospect.last_name, teamId,
     prospect.position, prospect.archetype, prospect.height_inches,
     prospect.weight_lbs, prospect.age, Math.floor(Math.random() * 99),
     0, prospect.overall, prospect.potential, prospect.peak_age,
     prospect.durability, prospect.coachability,
     Math.floor(Math.random() * 60) + 20,
     Math.floor(Math.random() * 60) + 20,
     Math.floor(Math.random() * 40) + 30,
     Math.floor(Math.random() * 30) + 30,
     prospect.motor]
  );

  await client.query(
    `INSERT INTO player_attributes
     (player_id, inside_scoring, close_shot, mid_range, three_point, free_throw,
      shot_iq, offensive_consistency, layup, standing_dunk, driving_dunk, draw_foul,
      post_moves, post_control, ball_handling, speed_with_ball, passing_accuracy,
      passing_vision, passing_iq, offensive_iq, interior_defense, perimeter_defense,
      steal, block, defensive_iq, defensive_consistency, lateral_quickness,
      help_defense_iq, offensive_rebound, defensive_rebound, box_out, rebound_timing,
      speed, acceleration, strength, vertical, stamina, hustle, basketball_iq,
      clutch, consistency, work_ethic, aggression, streakiness, composure)
     SELECT $1, inside_scoring, close_shot, mid_range, three_point, free_throw,
      shot_iq, offensive_consistency, layup, standing_dunk, driving_dunk, draw_foul,
      post_moves, post_control, ball_handling, speed_with_ball, passing_accuracy,
      passing_vision, passing_iq, offensive_iq, interior_defense, perimeter_defense,
      steal, block, defensive_iq, defensive_consistency, lateral_quickness,
      help_defense_iq, offensive_rebound, defensive_rebound, box_out, rebound_timing,
      speed, acceleration, strength, vertical, stamina, hustle, basketball_iq,
      clutch, consistency, work_ethic, aggression, streakiness, composure
     FROM draft_prospect_attributes WHERE prospect_id = $2`,
    [playerId, prospectId]
  );

  return playerId;
}

export async function processDraftPick(
  prospectId: string,
  teamId: string,
  seasonId: string,
  currentRound: number,
  currentPick: number
): Promise<{ playerId: string; prospect: any } | null> {
  return withTransaction(async (client) => {
    const claimResult = await client.query(
      `UPDATE draft_prospects SET is_drafted = true
       WHERE id = $1 AND is_drafted = false
       RETURNING *`,
      [prospectId]
    );

    if (claimResult.rows.length === 0) {
      return null;
    }

    const prospect = claimResult.rows[0];
    const playerId = await createPlayerFromProspect(client, prospect, teamId, prospectId);

    await client.query(
      `UPDATE draft_prospects SET drafted_by_team_id = $1, draft_round = $2, draft_pick = $3 WHERE id = $4`,
      [teamId, currentRound, currentPick, prospectId]
    );

    await client.query(
      `UPDATE draft_picks SET player_id = $1 WHERE season_id = $2 AND pick_number = $3`,
      [playerId, seasonId, currentPick]
    );

    return { playerId, prospect };
  });
}
