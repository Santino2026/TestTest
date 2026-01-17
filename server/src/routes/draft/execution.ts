import { Router } from 'express';
import { getDraftState, buildDraftOrder, selectAIPick } from '../../draft';
import { authMiddleware } from '../../auth';
import { withAdvisoryLock, lockProspect } from '../../db/transactions';
import { getUserActiveFranchise } from '../../db/queries';
import { createPlayerFromProspect, processDraftPick } from './helpers';

const router = Router();

router.post('/pick', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const prospectId = req.body.player_id || req.body.prospect_id;
    if (!prospectId) {
      return res.status(400).json({ error: 'player_id required' });
    }

    const result = await withAdvisoryLock(`draft-pick-${prospectId}`, async (client) => {
      const prospect = await lockProspect(client, prospectId);
      if (!prospect) {
        throw { status: 404, message: 'Prospect not found' };
      }
      if (prospect.is_drafted) {
        throw { status: 400, message: 'Prospect already drafted' };
      }

      await client.query(
        `UPDATE draft_prospects SET is_drafted = true WHERE id = $1`,
        [prospectId]
      );

      const state = await getDraftState(prospect.season_id);
      const playerId = await createPlayerFromProspect(client, prospect, franchise.team_id, prospectId);

      await client.query(
        `UPDATE draft_prospects SET drafted_by_team_id = $1, draft_round = $2, draft_pick = $3 WHERE id = $4`,
        [franchise.team_id, state.current_round, state.current_pick, prospectId]
      );

      await client.query(
        `UPDATE draft_picks SET player_id = $1 WHERE season_id = $2 AND pick_number = $3`,
        [playerId, prospect.season_id, state.current_pick]
      );

      return {
        message: 'Draft pick made',
        player_id: playerId,
        player_name: `${prospect.first_name} ${prospect.last_name}`,
        position: prospect.position,
        overall: prospect.overall,
        potential: prospect.potential,
        pick_number: state.current_pick,
        round: state.current_round
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

router.post('/ai-pick', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchise.season_id;
    const state = await getDraftState(seasonId);

    if (state.is_draft_complete) {
      return res.status(400).json({ error: 'Draft is complete' });
    }

    const draftOrder = await buildDraftOrder(seasonId);
    const currentPickInfo = draftOrder.find(p => p.pick === state.current_pick);
    if (!currentPickInfo) {
      return res.status(500).json({ error: 'Could not determine current pick' });
    }

    if (currentPickInfo.team_id === franchise.team_id) {
      return res.status(400).json({ error: 'It is your pick - make your selection' });
    }

    const selection = await selectAIPick(currentPickInfo.team_id, seasonId);
    if (!selection) {
      return res.status(400).json({ error: 'No available prospects' });
    }

    const result = await processDraftPick(
      selection.prospect_id,
      currentPickInfo.team_id,
      seasonId,
      state.current_round,
      state.current_pick
    );

    if (!result) {
      return res.status(400).json({ error: 'Prospect already drafted' });
    }

    const newState = await getDraftState(seasonId);
    const nextPickInfo = draftOrder.find(p => p.pick === newState.current_pick);

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
      is_next_user_pick: nextPickInfo?.team_id === franchise.team_id,
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

    while (!state.is_draft_complete) {
      const currentPickInfo = draftOrder.find(p => p.pick === state.current_pick);
      if (!currentPickInfo || currentPickInfo.team_id === franchise.team_id) break;

      const selection = await selectAIPick(currentPickInfo.team_id, seasonId);
      if (!selection) break;

      const result = await processDraftPick(
        selection.prospect_id,
        currentPickInfo.team_id,
        seasonId,
        state.current_round,
        state.current_pick
      );

      if (result) {
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
      }

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

    while (!state.is_draft_complete) {
      const currentPickInfo = draftOrder.find(p => p.pick === state.current_pick);
      if (!currentPickInfo) break;

      const selection = await selectAIPick(currentPickInfo.team_id, seasonId);
      if (!selection) break;

      const result = await processDraftPick(
        selection.prospect_id,
        currentPickInfo.team_id,
        seasonId,
        state.current_round,
        state.current_pick
      );

      if (result) {
        picks.push({
          pick: state.current_pick,
          round: state.current_round,
          team_name: currentPickInfo.team_name,
          team_abbreviation: currentPickInfo.abbreviation,
          player_name: `${selection.first_name} ${selection.last_name}`,
          position: selection.position,
          overall: selection.overall,
          potential: selection.potential,
          is_user_pick: currentPickInfo.team_id === franchise.team_id
        });
      }

      state = await getDraftState(seasonId);
    }

    res.json({
      message: 'Draft complete!',
      total_picks: picks.length,
      user_picks: picks.filter(p => p.is_user_pick),
      all_picks: picks
    });
  } catch (error) {
    console.error('Auto-draft error:', error);
    res.status(500).json({ error: 'Failed to auto-draft' });
  }
});

export default router;
