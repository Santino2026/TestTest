import { Router } from 'express';
import { pool } from '../../db/pool';
import { generateDraftClass } from '../../draft';
import { authMiddleware } from '../../auth';
import { withAdvisoryLock } from '../../db/transactions';
import { getUserActiveFranchise } from '../../db/queries';

const router = Router();

router.get('/prospects', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const result = await pool.query(
      `SELECT dp.*, dp.mock_draft_position as projected_pick, dpa.*
       FROM draft_prospects dp
       LEFT JOIN draft_prospect_attributes dpa ON dp.id = dpa.prospect_id
       WHERE dp.season_id = $1 AND dp.is_drafted = false
       ORDER BY dp.mock_draft_position`,
      [franchise.season_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Draft prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch draft prospects' });
  }
});

router.post('/generate', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchise.season_id;
    const prospects = generateDraftClass();

    const result = await withAdvisoryLock(`draft-generate-${seasonId}`, async (client) => {
      const existingResult = await client.query(
        'SELECT COUNT(*) FROM draft_prospects WHERE season_id = $1',
        [seasonId]
      );

      if (parseInt(existingResult.rows[0].count) > 0) {
        throw { status: 400, message: 'Draft class already generated' };
      }

      for (const prospect of prospects) {
        await client.query(
          `INSERT INTO draft_prospects
           (id, season_id, first_name, last_name, position, archetype,
            height_inches, weight_lbs, age, overall, potential,
            mock_draft_position, big_board_rank, peak_age, durability,
            coachability, motor)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO NOTHING`,
          [prospect.id, seasonId, prospect.first_name, prospect.last_name,
           prospect.position, prospect.archetype, prospect.height_inches,
           prospect.weight_lbs, prospect.age, prospect.overall, prospect.potential,
           prospect.mock_draft_position, prospect.big_board_rank, prospect.peak_age,
           prospect.durability, prospect.coachability, prospect.motor]
        );

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
                   $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45)
           ON CONFLICT (prospect_id) DO NOTHING`,
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

export default router;
