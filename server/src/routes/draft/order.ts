import { Router } from 'express';
import { pool } from '../../db/pool';
import { getDraftState, buildDraftOrder, evaluateTeamNeeds } from '../../draft';
import { authMiddleware } from '../../auth';
import { getUserActiveFranchise } from '../../db/queries';

const router = Router();

router.get('/order', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const picksResult = await pool.query(
      `SELECT dp.pick_number, dp.round, dp.current_team_id as team_id,
              t.name as team_name, t.abbreviation, dp.player_id,
              p.first_name || ' ' || p.last_name as player_name
       FROM draft_picks dp
       JOIN teams t ON dp.current_team_id = t.id
       LEFT JOIN players p ON dp.player_id = p.id
       WHERE dp.season_id = $1
       ORDER BY dp.pick_number`,
      [franchise.season_id]
    );

    res.json(picksResult.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch draft order' });
  }
});

router.get('/state', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const state = await getDraftState(franchise.season_id);

    if (state.is_draft_complete) {
      return res.json({ ...state, current_team: null, is_user_pick: false, message: 'Draft complete' });
    }

    const draftOrder = await buildDraftOrder(franchise.season_id);
    const currentPickInfo = draftOrder.find(p => p.pick === state.current_pick);
    if (!currentPickInfo) {
      return res.status(500).json({ error: 'Could not determine current pick' });
    }

    res.json({
      ...state,
      current_team: {
        team_id: currentPickInfo.team_id,
        team_name: currentPickInfo.team_name,
        abbreviation: currentPickInfo.abbreviation,
      },
      is_user_pick: currentPickInfo.team_id === franchise.team_id,
      user_team_id: franchise.team_id
    });
  } catch (error) {
    console.error('Draft state error:', error);
    res.status(500).json({ error: 'Failed to get draft state' });
  }
});

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

export default router;
