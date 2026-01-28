import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../db/transactions';
import { getDraftState } from '../../draft';
import { generateYearlySalaries } from '../../freeagency';

const ROSTER_LIMIT = 15;

function getRookieContract(pickNumber: number): { salary: number; years: number } {
  const isFirstRound = pickNumber <= 30;
  const years = isFirstRound ? 4 : 2;
  const salary = Math.max(1_500_000, 12_000_000 - (pickNumber - 1) * 350_000);
  return { salary, years };
}

export async function createPlayerFromProspect(
  client: PoolClient,
  prospect: any,
  teamId: string,
  prospectId: string,
  pickNumber: number
): Promise<string> {
  // Check roster size before drafting - release lowest OVR player if at limit
  const rosterCount = await client.query(
    'SELECT COUNT(*) FROM players WHERE team_id = $1',
    [teamId]
  );
  if (parseInt(rosterCount.rows[0].count) >= ROSTER_LIMIT) {
    await client.query(`
      UPDATE players SET team_id = NULL
      WHERE id = (
        SELECT id FROM players WHERE team_id = $1
        ORDER BY overall ASC LIMIT 1
      )`, [teamId]);
  }

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

  const { salary, years } = getRookieContract(pickNumber);
  const salaries = generateYearlySalaries(salary, years, 0.05);

  await client.query(
    `INSERT INTO contracts (player_id, team_id, total_years, years_remaining, base_salary,
      year_1_salary, year_2_salary, year_3_salary, year_4_salary, year_5_salary, contract_type, status)
     VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, 'rookie', 'active')
     ON CONFLICT (player_id) DO UPDATE SET
       team_id = EXCLUDED.team_id, total_years = EXCLUDED.total_years,
       years_remaining = EXCLUDED.years_remaining, base_salary = EXCLUDED.base_salary,
       year_1_salary = EXCLUDED.year_1_salary, year_2_salary = EXCLUDED.year_2_salary,
       year_3_salary = EXCLUDED.year_3_salary, year_4_salary = EXCLUDED.year_4_salary,
       year_5_salary = EXCLUDED.year_5_salary, contract_type = EXCLUDED.contract_type,
       status = EXCLUDED.status, updated_at = NOW()`,
    [playerId, teamId, years, salary,
     salaries[0], salaries[1] || null, salaries[2] || null, salaries[3] || null, salaries[4] || null]
  );

  await client.query(
    `UPDATE players SET salary = $1 WHERE id = $2`,
    [salary, playerId]
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
    const playerId = await createPlayerFromProspect(client, prospect, teamId, prospectId, currentPick);

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
