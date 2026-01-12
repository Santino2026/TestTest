// Draft API Routes
import { Router } from 'express';
import { pool } from '../db/pool';
import {
  generateDraftClass,
  convertProspectToPlayer,
  simulateLottery,
  getLotteryOdds,
  LotteryTeam,
  getDraftState,
  buildDraftOrder,
  selectAIPick,
  evaluateTeamNeeds
} from '../draft';
import { authMiddleware } from '../auth';
import { v4 as uuidv4 } from 'uuid';
import { withAdvisoryLock, withTransaction, lockProspect } from '../db/transactions';
import { getLatestSeasonId, getUserActiveFranchise } from '../db/queries';

const router = Router();

// Get current draft class (prospects)
router.get('/prospects', async (req, res) => {
  try {
    const seasonId = await getLatestSeasonId();

    if (!seasonId) {
      return res.json({ prospects: [] });
    }

    const result = await pool.query(
      `SELECT dp.*, dpa.*
       FROM draft_prospects dp
       LEFT JOIN draft_prospect_attributes dpa ON dp.id = dpa.prospect_id
       WHERE dp.season_id = $1 AND dp.is_drafted = false
       ORDER BY dp.mock_draft_position`,
      [seasonId]
    );

    res.json({ prospects: result.rows });
  } catch (error) {
    console.error('Draft prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch draft prospects' });
  }
});

// Generate new draft class
router.post('/generate', async (req, res) => {
  try {
    const seasonId = await getLatestSeasonId();

    if (!seasonId) {
      return res.status(400).json({ error: 'No active season' });
    }

    // Generate draft class data before entering transaction (CPU-bound work)
    const prospects = generateDraftClass();

    // Use advisory lock to serialize draft class generation per season
    const result = await withAdvisoryLock(`draft-generate-${seasonId}`, async (client) => {
      // Check if draft class already exists (inside lock to prevent race condition)
      const existingResult = await client.query(
        'SELECT COUNT(*) FROM draft_prospects WHERE season_id = $1',
        [seasonId]
      );

      if (parseInt(existingResult.rows[0].count) > 0) {
        throw { status: 400, message: 'Draft class already generated' };
      }

      // Insert prospects into database
      for (const prospect of prospects) {
        await client.query(
          `INSERT INTO draft_prospects
           (id, season_id, first_name, last_name, position, archetype,
            height_inches, weight_lbs, age, overall, potential,
            mock_draft_position, big_board_rank, peak_age, durability,
            coachability, motor)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [prospect.id, seasonId, prospect.first_name, prospect.last_name,
           prospect.position, prospect.archetype, prospect.height_inches,
           prospect.weight_lbs, prospect.age, prospect.overall, prospect.potential,
           prospect.mock_draft_position, prospect.big_board_rank, prospect.peak_age,
           prospect.durability, prospect.coachability, prospect.motor]
        );

        // Insert prospect attributes
        const attrs = prospect.attributes;
        await client.query(
          `INSERT INTO draft_prospect_attributes
           (prospect_id, inside_scoring, close_shot, mid_range, three_point, free_throw,
            shot_iq, offensive_consistency, layup, standing_dunk, driving_dunk, draw_foul,
            post_moves, post_control, ball_handling, speed_with_ball, passing_accuracy,
            passing_vision, passing_iq, offensive_iq, interior_defense, perimeter_defense,
            steal, block, defensive_iq, defensive_consistency, lateral_quickness,
            help_defense_iq, offensive_rebound, defensive_rebound, box_out, rebound_timing,
            speed, acceleration, strength, vertical, stamina, hustle, basketball_iq,
            clutch, consistency, work_ethic, aggression, streakiness, composure)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                   $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
                   $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45)`,
          [prospect.id,
           attrs.inside_scoring, attrs.close_shot, attrs.mid_range, attrs.three_point,
           attrs.free_throw, attrs.shot_iq, attrs.offensive_consistency, attrs.layup,
           attrs.standing_dunk, attrs.driving_dunk, attrs.draw_foul, attrs.post_moves,
           attrs.post_control, attrs.ball_handling, attrs.speed_with_ball,
           attrs.passing_accuracy, attrs.passing_vision, attrs.passing_iq, attrs.offensive_iq,
           attrs.interior_defense, attrs.perimeter_defense, attrs.steal, attrs.block,
           attrs.defensive_iq, attrs.defensive_consistency, attrs.lateral_quickness,
           attrs.help_defense_iq, attrs.offensive_rebound, attrs.defensive_rebound,
           attrs.box_out, attrs.rebound_timing, attrs.speed, attrs.acceleration,
           attrs.strength, attrs.vertical, attrs.stamina, attrs.hustle, attrs.basketball_iq,
           attrs.clutch, attrs.consistency, attrs.work_ethic, attrs.aggression,
           attrs.streakiness, attrs.composure]
        );
      }

      return {
        message: 'Draft class generated',
        total_prospects: prospects.length,
        lottery_picks: 14,
        first_round: 30,
        second_round: 30,
        undrafted_pool: 20
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Draft generation error:', error);
    res.status(500).json({ error: 'Failed to generate draft class' });
  }
});

// Get lottery odds
router.get('/lottery/odds', async (req, res) => {
  try {
    const seasonId = await getLatestSeasonId();

    // Get bottom 14 teams by record
    const standingsResult = await pool.query(
      `SELECT t.id, t.name, t.abbreviation, s.wins, s.losses,
              ROW_NUMBER() OVER (ORDER BY s.wins ASC, s.losses DESC) as lottery_position
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
       ORDER BY s.wins ASC, s.losses DESC
       LIMIT 14`,
      [seasonId]
    );

    const lotteryTeams = standingsResult.rows.map((t: any, idx: number) => ({
      team_id: t.id,
      team_name: t.name,
      abbreviation: t.abbreviation,
      wins: t.wins,
      losses: t.losses,
      lottery_position: idx + 1,
      odds: getLotteryOdds(idx + 1)
    }));

    res.json({ lottery_teams: lotteryTeams });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lottery odds' });
  }
});

// Run the draft lottery
router.post('/lottery/run', async (req, res) => {
  try {
    const seasonId = await getLatestSeasonId();

    // Check if lottery already run
    const existingResult = await pool.query(
      'SELECT COUNT(*) FROM draft_lottery WHERE season_id = $1 AND post_lottery_position IS NOT NULL',
      [seasonId]
    );

    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Lottery already completed' });
    }

    // Get bottom 14 teams
    const standingsResult = await pool.query(
      `SELECT t.id, t.name, s.wins, s.losses
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
       ORDER BY s.wins ASC, s.losses DESC
       LIMIT 14`,
      [seasonId]
    );

    const teams: LotteryTeam[] = standingsResult.rows.map((t: any, idx: number) => ({
      team_id: t.id,
      team_name: t.name,
      pre_lottery_position: idx + 1,
      lottery_odds: getLotteryOdds(idx + 1)
    }));

    // Run lottery simulation
    const results = simulateLottery(teams);

    // Save lottery results
    for (const result of results) {
      await pool.query(
        `INSERT INTO draft_lottery
         (season_id, team_id, pre_lottery_position, lottery_odds, post_lottery_position, lottery_win)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (season_id, team_id) DO UPDATE
         SET post_lottery_position = $5, lottery_win = $6`,
        [seasonId, result.team_id, result.pre_lottery_position,
         result.lottery_odds, result.post_lottery_position, result.lottery_win]
      );
    }

    // Get non-lottery teams (picks 15-30) ordered by record
    const nonLotteryResult = await pool.query(
      `SELECT t.id
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
         AND t.id NOT IN (SELECT team_id FROM draft_lottery WHERE season_id = $1)
       ORDER BY s.wins ASC, s.losses DESC`,
      [seasonId]
    );

    // Create draft_picks entries for all 60 picks
    // First round: lottery (1-14) + non-lottery (15-30)
    const firstRoundOrder: string[] = [];

    // Add lottery picks in their post-lottery order
    const sortedLottery = results.sort((a, b) => (a.post_lottery_position || 0) - (b.post_lottery_position || 0));
    for (const r of sortedLottery) {
      firstRoundOrder.push(r.team_id);
    }

    // Add non-lottery teams (15-30)
    for (const row of nonLotteryResult.rows) {
      firstRoundOrder.push(row.id);
    }

    // Create first round picks (1-30)
    for (let i = 0; i < firstRoundOrder.length; i++) {
      const pickNumber = i + 1;
      const teamId = firstRoundOrder[i];
      await pool.query(
        `INSERT INTO draft_picks (season_id, round, pick_number, original_team_id, current_team_id)
         VALUES ($1, 1, $2, $3, $3)
         ON CONFLICT (season_id, round, pick_number) DO UPDATE
         SET original_team_id = $3, current_team_id = $3`,
        [seasonId, pickNumber, teamId]
      );
    }

    // Create second round picks (31-60) - reverse order
    for (let i = 0; i < firstRoundOrder.length; i++) {
      const pickNumber = 31 + i;
      const teamId = firstRoundOrder[firstRoundOrder.length - 1 - i];
      await pool.query(
        `INSERT INTO draft_picks (season_id, round, pick_number, original_team_id, current_team_id)
         VALUES ($1, 2, $2, $3, $3)
         ON CONFLICT (season_id, round, pick_number) DO UPDATE
         SET original_team_id = $3, current_team_id = $3`,
        [seasonId, pickNumber, teamId]
      );
    }

    res.json({
      message: 'Lottery completed',
      results: results.map(r => ({
        pick: r.post_lottery_position,
        team: r.team_name,
        moved_up: r.lottery_win,
        original_position: r.pre_lottery_position
      }))
    });
  } catch (error) {
    console.error('Lottery error:', error);
    res.status(500).json({ error: 'Failed to run lottery' });
  }
});

// Get draft order (after lottery)
router.get('/order', async (req, res) => {
  try {
    const seasonId = await getLatestSeasonId();

    // Get lottery results for picks 1-14
    const lotteryResult = await pool.query(
      `SELECT dl.*, t.name, t.abbreviation
       FROM draft_lottery dl
       JOIN teams t ON dl.team_id = t.id
       WHERE dl.season_id = $1
       ORDER BY dl.post_lottery_position`,
      [seasonId]
    );

    // Get non-lottery teams (15-30) ordered by record (worst first)
    const nonLotteryResult = await pool.query(
      `SELECT t.id, t.name, t.abbreviation, s.wins, s.losses
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
         AND t.id NOT IN (SELECT team_id FROM draft_lottery WHERE season_id = $1)
       ORDER BY s.wins ASC, s.losses DESC`,
      [seasonId]
    );

    // Combine for full first round
    const draftOrder = [
      ...lotteryResult.rows.map((t: any) => ({
        pick: t.post_lottery_position,
        round: 1,
        team_id: t.team_id,
        team_name: t.name,
        abbreviation: t.abbreviation,
        lottery_win: t.lottery_win
      })),
      ...nonLotteryResult.rows.map((t: any, idx: number) => ({
        pick: 15 + idx,
        round: 1,
        team_id: t.id,
        team_name: t.name,
        abbreviation: t.abbreviation,
        lottery_win: false
      }))
    ];

    // Add second round (reverse order of first round)
    const secondRound = [...draftOrder].reverse().map((t, idx) => ({
      ...t,
      pick: 31 + idx,
      round: 2
    }));

    res.json({
      first_round: draftOrder,
      second_round: secondRound
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch draft order' });
  }
});

// Make a draft pick
router.post('/pick', async (req, res) => {
  try {
    const { prospect_id, team_id } = req.body;

    if (!prospect_id || !team_id) {
      return res.status(400).json({ error: 'prospect_id and team_id required' });
    }

    // Use advisory lock to serialize draft picks for this prospect
    const result = await withAdvisoryLock(`draft-pick-${prospect_id}`, async (client) => {
      // Lock the prospect row first
      const prospect = await lockProspect(client, prospect_id);
      if (!prospect) {
        throw { status: 404, message: 'Prospect not found' };
      }
      if (prospect.is_drafted) {
        throw { status: 400, message: 'Prospect already drafted' };
      }

      // Mark as drafted
      await client.query(
        `UPDATE draft_prospects SET is_drafted = true WHERE id = $1`,
        [prospect_id]
      );

      // Get prospect attributes
      const attrsResult = await client.query(
        `SELECT * FROM draft_prospect_attributes WHERE prospect_id = $1`,
        [prospect_id]
      );
      const attrs = attrsResult.rows[0] || {};

      // Get current pick number
      const state = await getDraftState(prospect.season_id);
      const currentPick = state.current_pick;
      const currentRound = state.current_round;

      // Create player from prospect
      const playerId = uuidv4();

      await client.query(
        `INSERT INTO players
         (id, first_name, last_name, team_id, position, archetype,
          height_inches, weight_lbs, age, jersey_number, years_pro,
          overall, potential, peak_age, durability, coachability,
          greed, ego, loyalty, leadership, motor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [playerId, prospect.first_name, prospect.last_name, team_id,
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

      // Copy attributes if they exist
      if (attrs.inside_scoring !== undefined) {
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
          [playerId, prospect_id]
        );
      }

      // Update draft info on prospect
      await client.query(
        `UPDATE draft_prospects
         SET drafted_by_team_id = $1, draft_round = $2, draft_pick = $3
         WHERE id = $4`,
        [team_id, currentRound, currentPick, prospect_id]
      );

      // Update draft_picks table to mark pick as used
      await client.query(
        `UPDATE draft_picks
         SET player_id = $1
         WHERE season_id = $2 AND pick_number = $3`,
        [playerId, prospect.season_id, currentPick]
      );

      return {
        message: 'Draft pick made',
        player_id: playerId,
        player_name: `${prospect.first_name} ${prospect.last_name}`,
        position: prospect.position,
        overall: prospect.overall,
        potential: prospect.potential,
        pick_number: currentPick,
        round: currentRound
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Draft pick error:', error);
    res.status(500).json({ error: 'Failed to make draft pick' });
  }
});

// Get current draft state
router.get('/state', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchise.season_id;

    // Get draft state
    const state = await getDraftState(seasonId);

    if (state.is_draft_complete) {
      return res.json({
        ...state,
        current_team: null,
        is_user_pick: false,
        message: 'Draft complete'
      });
    }

    // Get draft order
    const draftOrder = await buildDraftOrder(seasonId);
    const currentPickInfo = draftOrder.find(p => p.pick === state.current_pick);

    if (!currentPickInfo) {
      return res.status(500).json({ error: 'Could not determine current pick' });
    }

    const isUserPick = currentPickInfo.team_id === franchise.team_id;

    res.json({
      ...state,
      current_team: {
        team_id: currentPickInfo.team_id,
        team_name: currentPickInfo.team_name,
        abbreviation: currentPickInfo.abbreviation,
      },
      is_user_pick: isUserPick,
      user_team_id: franchise.team_id
    });
  } catch (error) {
    console.error('Draft state error:', error);
    res.status(500).json({ error: 'Failed to get draft state' });
  }
});

// Get team needs for user's team
router.get('/needs', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const needs = await evaluateTeamNeeds(franchise.team_id);
    res.json({ needs });
  } catch (error) {
    console.error('Team needs error:', error);
    res.status(500).json({ error: 'Failed to get team needs' });
  }
});

// AI makes the current pick (for CPU teams)
router.post('/ai-pick', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchise.season_id;

    // Get draft state
    const state = await getDraftState(seasonId);

    if (state.is_draft_complete) {
      return res.status(400).json({ error: 'Draft is complete' });
    }

    // Get current pick team
    const draftOrder = await buildDraftOrder(seasonId);
    const currentPickInfo = draftOrder.find(p => p.pick === state.current_pick);

    if (!currentPickInfo) {
      return res.status(500).json({ error: 'Could not determine current pick' });
    }

    // Check it's not user's pick
    if (currentPickInfo.team_id === franchise.team_id) {
      return res.status(400).json({ error: 'It is your pick - make your selection' });
    }

    // AI selects a prospect
    const selection = await selectAIPick(currentPickInfo.team_id, seasonId);

    if (!selection) {
      return res.status(400).json({ error: 'No available prospects' });
    }

    // Use transaction with atomic prospect claim to prevent race conditions
    const result = await withTransaction(async (client) => {
      // Atomically claim the prospect - prevents double-drafting
      const claimResult = await client.query(
        `UPDATE draft_prospects SET is_drafted = true
         WHERE id = $1 AND is_drafted = false
         RETURNING *`,
        [selection.prospect_id]
      );

      if (claimResult.rows.length === 0) {
        throw { status: 400, message: 'Prospect already drafted' };
      }

      const prospect = claimResult.rows[0];
      const playerId = uuidv4();

      await client.query(
        `INSERT INTO players
         (id, first_name, last_name, team_id, position, archetype,
          height_inches, weight_lbs, age, jersey_number, years_pro,
          overall, potential, peak_age, durability, coachability,
          greed, ego, loyalty, leadership, motor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [playerId, prospect.first_name, prospect.last_name, currentPickInfo.team_id,
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

      // Copy attributes
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
        [playerId, selection.prospect_id]
      );

      // Update draft info on prospect
      await client.query(
        `UPDATE draft_prospects SET drafted_by_team_id = $1, draft_round = $2, draft_pick = $3 WHERE id = $4`,
        [currentPickInfo.team_id, state.current_round, state.current_pick, selection.prospect_id]
      );

      // Update draft_picks table
      await client.query(
        `UPDATE draft_picks SET player_id = $1 WHERE season_id = $2 AND pick_number = $3`,
        [playerId, seasonId, state.current_pick]
      );

      return { playerId, prospect };
    });

    // Get new state after transaction
    const newState = await getDraftState(seasonId);
    const nextPickInfo = draftOrder.find(p => p.pick === newState.current_pick);
    const isNextUserPick = nextPickInfo?.team_id === franchise.team_id;

    res.json({
      pick: state.current_pick,
      round: state.current_round,
      team_name: currentPickInfo.team_name,
      team_abbreviation: currentPickInfo.abbreviation,
      player_name: `${selection.first_name} ${selection.last_name}`,
      position: selection.position,
      overall: selection.overall,
      potential: selection.potential,
      next_pick: newState.current_pick,
      is_next_user_pick: isNextUserPick,
      is_draft_complete: newState.is_draft_complete
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('AI pick error:', error);
    res.status(500).json({ error: 'Failed to make AI pick' });
  }
});

// Helper function to process a single draft pick atomically
async function processDraftPick(
  prospectId: string,
  teamId: string,
  seasonId: string,
  currentRound: number,
  currentPick: number
): Promise<{ playerId: string; prospect: any } | null> {
  return withTransaction(async (client) => {
    // Atomically claim the prospect - prevents double-drafting
    const claimResult = await client.query(
      `UPDATE draft_prospects SET is_drafted = true
       WHERE id = $1 AND is_drafted = false
       RETURNING *`,
      [prospectId]
    );

    if (claimResult.rows.length === 0) {
      return null; // Prospect already drafted
    }

    const prospect = claimResult.rows[0];
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

    // Copy attributes
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

    // Update draft info on prospect
    await client.query(
      `UPDATE draft_prospects SET drafted_by_team_id = $1, draft_round = $2, draft_pick = $3 WHERE id = $4`,
      [teamId, currentRound, currentPick, prospectId]
    );

    // Update draft_picks table
    await client.query(
      `UPDATE draft_picks SET player_id = $1 WHERE season_id = $2 AND pick_number = $3`,
      [playerId, seasonId, currentPick]
    );

    return { playerId, prospect };
  });
}

// Simulate picks until user's turn or draft complete
router.post('/sim-to-pick', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchise.season_id;
    const draftOrder = await buildDraftOrder(seasonId);

    const picks: any[] = [];
    let state = await getDraftState(seasonId);

    // Simulate until user's turn or draft complete
    while (!state.is_draft_complete) {
      const currentPickInfo = draftOrder.find(p => p.pick === state.current_pick);

      if (!currentPickInfo) break;

      // Stop if it's user's pick
      if (currentPickInfo.team_id === franchise.team_id) {
        break;
      }

      // AI makes pick
      const selection = await selectAIPick(currentPickInfo.team_id, seasonId);
      if (!selection) break;

      // Process pick atomically using transaction
      const result = await processDraftPick(
        selection.prospect_id,
        currentPickInfo.team_id,
        seasonId,
        state.current_round,
        state.current_pick
      );

      if (!result) {
        // Prospect already drafted - try next pick
        state = await getDraftState(seasonId);
        continue;
      }

      picks.push({
        pick: state.current_pick,
        round: state.current_round,
        team_name: currentPickInfo.team_name,
        team_abbreviation: currentPickInfo.abbreviation,
        player_name: `${selection.first_name} ${selection.last_name}`,
        position: selection.position,
        overall: selection.overall,
        potential: selection.potential
      });

      state = await getDraftState(seasonId);
    }

    const nextPickInfo = draftOrder.find(p => p.pick === state.current_pick);

    res.json({
      picks_made: picks.length,
      picks,
      current_pick: state.current_pick,
      is_user_pick: nextPickInfo?.team_id === franchise.team_id,
      is_draft_complete: state.is_draft_complete
    });
  } catch (error) {
    console.error('Sim to pick error:', error);
    res.status(500).json({ error: 'Failed to simulate picks' });
  }
});

// Auto-draft all remaining picks
router.post('/auto-draft', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchise.season_id;
    const draftOrder = await buildDraftOrder(seasonId);

    const picks: any[] = [];
    let state = await getDraftState(seasonId);

    // Simulate all remaining picks
    while (!state.is_draft_complete) {
      const currentPickInfo = draftOrder.find(p => p.pick === state.current_pick);
      if (!currentPickInfo) break;

      // AI makes pick (even for user's team in auto-draft)
      const selection = await selectAIPick(currentPickInfo.team_id, seasonId);
      if (!selection) break;

      // Process pick atomically using transaction
      const result = await processDraftPick(
        selection.prospect_id,
        currentPickInfo.team_id,
        seasonId,
        state.current_round,
        state.current_pick
      );

      if (!result) {
        // Prospect already drafted - try next pick
        state = await getDraftState(seasonId);
        continue;
      }

      const isUserPick = currentPickInfo.team_id === franchise.team_id;

      picks.push({
        pick: state.current_pick,
        round: state.current_round,
        team_name: currentPickInfo.team_name,
        team_abbreviation: currentPickInfo.abbreviation,
        player_name: `${selection.first_name} ${selection.last_name}`,
        position: selection.position,
        overall: selection.overall,
        potential: selection.potential,
        is_user_pick: isUserPick
      });

      state = await getDraftState(seasonId);
    }

    // Get user's picks
    const userPicks = picks.filter(p => p.is_user_pick);

    res.json({
      message: 'Draft complete!',
      total_picks: picks.length,
      user_picks: userPicks,
      all_picks: picks
    });
  } catch (error) {
    console.error('Auto-draft error:', error);
    res.status(500).json({ error: 'Failed to auto-draft' });
  }
});

export default router;
