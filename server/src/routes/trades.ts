// Trade API Routes
import { Router } from 'express';
import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import {
  validateTrade,
  evaluateTradeForTeam,
  TradeProposal,
  TradeAsset,
  TeamTradeContext
} from '../trading';
import { SALARY_CAP } from '../freeagency';
import { authMiddleware } from '../auth';
import { withAdvisoryLock, lockPlayer } from '../db/transactions';
import { getLatestSeasonId, getUserActiveFranchise, getSeasonTradeDeadlineDay } from '../db/queries';

const router = Router();

// Helper to check trade deadline
async function checkTradeDeadline(userId: string): Promise<{ allowed: boolean; message?: string; deadline_day?: number; current_day?: number; days_until?: number }> {
  // Get user's franchise using shared utility
  const franchise = await getUserActiveFranchise(userId);

  if (!franchise) {
    return { allowed: false, message: 'No active franchise' };
  }

  const deadlineDay = await getSeasonTradeDeadlineDay(franchise.season_id);
  const currentDay = franchise.current_day || 1;

  // Trades allowed during regular season before deadline, or during offseason
  if (franchise.phase === 'offseason') {
    return { allowed: true, deadline_day: deadlineDay, current_day: currentDay };
  }

  if (franchise.phase !== 'regular_season') {
    return {
      allowed: false,
      message: `Trades not allowed during ${franchise.phase}`,
      deadline_day: deadlineDay,
      current_day: currentDay
    };
  }

  if (currentDay > deadlineDay) {
    return {
      allowed: false,
      message: 'Trade deadline has passed',
      deadline_day: deadlineDay,
      current_day: currentDay
    };
  }

  return {
    allowed: true,
    deadline_day: deadlineDay,
    current_day: currentDay,
    days_until: deadlineDay - currentDay
  };
}

// Get trade deadline status
router.get('/deadline', authMiddleware(true), async (req: any, res) => {
  try {
    const status = await checkTradeDeadline(req.user.userId);

    res.json({
      trades_allowed: status.allowed,
      message: status.message,
      deadline_day: status.deadline_day,
      current_day: status.current_day,
      days_until_deadline: status.days_until
    });
  } catch (error) {
    console.error('Get deadline error:', error);
    res.status(500).json({ error: 'Failed to get trade deadline status' });
  }
});

// Get all active trade proposals for a team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const result = await pool.query(
      `SELECT tp.*,
              array_agg(DISTINCT ta.id) as asset_ids
       FROM trade_proposals tp
       LEFT JOIN trade_assets ta ON tp.id = ta.trade_id
       WHERE $1 = ANY(tp.team_ids) AND tp.status = 'pending'
       GROUP BY tp.id
       ORDER BY tp.proposed_at DESC`,
      [teamId]
    );

    // Get full asset details for each proposal
    const proposals = await Promise.all(result.rows.map(async (proposal) => {
      const assetsResult = await pool.query(
        `SELECT ta.*, p.first_name, p.last_name, p.position, p.overall, p.age,
                t_from.name as from_team_name, t_from.abbreviation as from_abbrev,
                t_to.name as to_team_name, t_to.abbreviation as to_abbrev
         FROM trade_assets ta
         LEFT JOIN players p ON ta.player_id = p.id
         JOIN teams t_from ON ta.from_team_id = t_from.id
         JOIN teams t_to ON ta.to_team_id = t_to.id
         WHERE ta.trade_id = $1`,
        [proposal.id]
      );

      return {
        ...proposal,
        assets: assetsResult.rows
      };
    }));

    res.json({ proposals });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trade proposals' });
  }
});

// Propose a new trade
router.post('/propose', authMiddleware(true), async (req: any, res) => {
  try {
    const { from_team_id, to_team_id, assets } = req.body;

    // Check trade deadline
    const deadlineStatus = await checkTradeDeadline(req.user.userId);
    if (!deadlineStatus.allowed) {
      return res.status(403).json({
        error: deadlineStatus.message || 'Trades not allowed',
        deadline_day: deadlineStatus.deadline_day,
        current_day: deadlineStatus.current_day
      });
    }

    if (!from_team_id || !to_team_id || !assets || assets.length === 0) {
      return res.status(400).json({ error: 'from_team_id, to_team_id, and assets are required' });
    }

    // Get season
    const seasonId = await getLatestSeasonId();

    // Get team info for validation
    const teamsResult = await pool.query(
      `SELECT t.id, t.name, s.wins, s.losses,
              (SELECT COUNT(*) FROM players WHERE team_id = t.id) as roster_size,
              (SELECT COALESCE(SUM(salary), 0) FROM players WHERE team_id = t.id) as payroll
       FROM teams t
       LEFT JOIN standings s ON t.id = s.team_id AND s.season_id = $1
       WHERE t.id IN ($2, $3)`,
      [seasonId, from_team_id, to_team_id]
    );

    const teamsMap = new Map<string, TeamTradeContext>();
    for (const team of teamsResult.rows) {
      const payroll = parseInt(team.payroll) || 0;
      teamsMap.set(team.id, {
        team_id: team.id,
        team_name: team.name,
        wins: team.wins || 0,
        losses: team.losses || 0,
        payroll,
        cap_space: SALARY_CAP.cap - payroll,
        roster_size: parseInt(team.roster_size) || 0,
        is_contender: (team.wins || 0) > 41,
        is_rebuilding: (team.wins || 0) < 30,
        positional_needs: []
      });
    }

    // Get player info for validation
    const playerIds = assets.filter((a: any) => a.player_id).map((a: any) => a.player_id);
    const playersMap = new Map<string, any>();

    if (playerIds.length > 0) {
      const playersResult = await pool.query(
        `SELECT id, salary, tradeable_after, last_traded_at,
                (SELECT no_trade_clause FROM contracts WHERE player_id = players.id AND status = 'active' LIMIT 1) as no_trade_clause
         FROM players WHERE id = ANY($1)`,
        [playerIds]
      );

      for (const player of playersResult.rows) {
        playersMap.set(player.id, {
          salary: parseInt(player.salary) || 0,
          signed_date: player.tradeable_after ? new Date(player.tradeable_after) : null,
          last_traded_at: player.last_traded_at ? new Date(player.last_traded_at) : null,
          no_trade_clause: player.no_trade_clause
        });
      }
    }

    // Build trade proposal for validation
    const tradeAssets: TradeAsset[] = assets.map((a: any) => ({
      asset_type: a.asset_type || 'player',
      from_team_id: a.from_team_id,
      to_team_id: a.to_team_id,
      player_id: a.player_id,
      player_salary: playersMap.get(a.player_id)?.salary,
      pick_year: a.pick_year,
      pick_round: a.pick_round,
      cash_amount: a.cash_amount
    }));

    const proposal: TradeProposal = {
      id: uuidv4(),
      teams: [from_team_id, to_team_id],
      assets: tradeAssets,
      status: 'pending',
      proposed_by: from_team_id
    };

    // Validate trade
    const validation = validateTrade(proposal, teamsMap, playersMap);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid trade',
        validation_errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Create trade proposal
    const tradeId = uuidv4();
    await pool.query(
      `INSERT INTO trade_proposals
       (id, season_id, team_ids, proposed_by_team_id, status, is_valid, validation_errors, summary)
       VALUES ($1, $2, $3, $4, 'pending', true, $5, $6)`,
      [tradeId, seasonId, [from_team_id, to_team_id], from_team_id,
       validation.warnings, `Trade between ${teamsMap.get(from_team_id)?.team_name} and ${teamsMap.get(to_team_id)?.team_name}`]
    );

    // Create trade assets
    for (const asset of assets) {
      await pool.query(
        `INSERT INTO trade_assets
         (trade_id, from_team_id, to_team_id, asset_type, player_id, pick_year, pick_round, pick_original_team_id, cash_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [tradeId, asset.from_team_id, asset.to_team_id, asset.asset_type || 'player',
         asset.player_id || null, asset.pick_year || null, asset.pick_round || null,
         asset.pick_original_team_id || null, asset.cash_amount || null]
      );
    }

    res.json({
      message: 'Trade proposed',
      trade_id: tradeId,
      warnings: validation.warnings
    });
  } catch (error) {
    console.error('Propose trade error:', error);
    res.status(500).json({ error: 'Failed to propose trade' });
  }
});

// Evaluate a trade (for CPU AI response)
router.get('/:tradeId/evaluate/:teamId', async (req, res) => {
  try {
    const { tradeId, teamId } = req.params;

    // Get proposal
    const proposalResult = await pool.query(
      `SELECT * FROM trade_proposals WHERE id = $1`,
      [tradeId]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const proposal = proposalResult.rows[0];

    // Get assets with player details
    const assetsResult = await pool.query(
      `SELECT ta.*, p.overall, p.potential, p.age, p.salary
       FROM trade_assets ta
       LEFT JOIN players p ON ta.player_id = p.id
       WHERE ta.trade_id = $1`,
      [tradeId]
    );

    // Get team context
    const teamResult = await pool.query(
      `SELECT t.id, t.name, s.wins, s.losses,
              (SELECT COUNT(*) FROM players WHERE team_id = t.id) as roster_size,
              (SELECT COALESCE(SUM(salary), 0) FROM players WHERE team_id = t.id) as payroll
       FROM teams t
       LEFT JOIN standings s ON t.id = s.team_id
       WHERE t.id = $1`,
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = teamResult.rows[0];
    const payroll = parseInt(team.payroll) || 0;
    const teamContext: TeamTradeContext = {
      team_id: team.id,
      team_name: team.name,
      wins: team.wins || 0,
      losses: team.losses || 0,
      payroll,
      cap_space: SALARY_CAP.cap - payroll,
      roster_size: parseInt(team.roster_size) || 0,
      is_contender: (team.wins || 0) > 41,
      is_rebuilding: (team.wins || 0) < 30,
      positional_needs: []
    };

    // Build proposal object
    const tradeProposal: TradeProposal = {
      id: proposal.id,
      teams: proposal.team_ids,
      assets: assetsResult.rows.map(a => ({
        asset_type: a.asset_type,
        from_team_id: a.from_team_id,
        to_team_id: a.to_team_id,
        player_id: a.player_id,
        player_overall: a.overall,
        player_potential: a.potential,
        player_age: a.age,
        player_salary: parseInt(a.salary) || 0,
        pick_year: a.pick_year,
        pick_round: a.pick_round
      })),
      status: proposal.status,
      proposed_by: proposal.proposed_by_team_id
    };

    // Get current year
    const seasonResult = await pool.query(
      `SELECT season_number FROM seasons ORDER BY season_number DESC LIMIT 1`
    );
    const currentYear = 2024 + (seasonResult.rows[0]?.season_number || 1);

    // Evaluate
    const evaluation = evaluateTradeForTeam(teamId, tradeProposal, teamContext, currentYear);

    res.json({ evaluation });
  } catch (error) {
    console.error('Evaluate trade error:', error);
    res.status(500).json({ error: 'Failed to evaluate trade' });
  }
});

// Accept a trade
router.post('/:tradeId/accept', authMiddleware(true), async (req: any, res) => {
  try {
    const { tradeId } = req.params;
    const { team_id } = req.body;

    // Check trade deadline
    const deadlineStatus = await checkTradeDeadline(req.user.userId);
    if (!deadlineStatus.allowed) {
      return res.status(403).json({
        error: deadlineStatus.message || 'Trades not allowed',
        deadline_day: deadlineStatus.deadline_day,
        current_day: deadlineStatus.current_day
      });
    }

    // Use advisory lock to serialize trade execution
    const result = await withAdvisoryLock(`trade-${tradeId}`, async (client) => {
      // Atomically claim the trade - prevents double-acceptance
      const proposalResult = await client.query(
        `UPDATE trade_proposals SET status = 'accepted', resolved_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [tradeId]
      );

      if (proposalResult.rows.length === 0) {
        throw { status: 404, message: 'Trade not found or not pending' };
      }

      const proposal = proposalResult.rows[0];

      // Verify team is part of trade and not the proposer
      if (!proposal.team_ids.includes(team_id)) {
        throw { status: 403, message: 'Team not part of this trade' };
      }

      if (proposal.proposed_by_team_id === team_id) {
        throw { status: 400, message: 'Cannot accept own proposal' };
      }

      // Get assets
      const assetsResult = await client.query(
        `SELECT * FROM trade_assets WHERE trade_id = $1`,
        [tradeId]
      );

      // Lock all player rows involved BEFORE executing transfers
      // This prevents players from being traded/signed elsewhere mid-transaction
      for (const asset of assetsResult.rows) {
        if (asset.asset_type === 'player' && asset.player_id) {
          const player = await lockPlayer(client, asset.player_id);
          if (!player) {
            throw { status: 400, message: `Player ${asset.player_id} not found` };
          }
          // Verify player is still on the expected team
          if (player.team_id !== asset.from_team_id) {
            throw { status: 400, message: 'Player is no longer on the expected team - trade invalid' };
          }
        }
      }

      // Execute the trade
      for (const asset of assetsResult.rows) {
        if (asset.asset_type === 'player' && asset.player_id) {
          // Transfer player
          await client.query(
            `UPDATE players SET team_id = $1, last_traded_at = NOW() WHERE id = $2`,
            [asset.to_team_id, asset.player_id]
          );

          // Update contract
          await client.query(
            `UPDATE contracts SET team_id = $1, updated_at = NOW() WHERE player_id = $2 AND status = 'active'`,
            [asset.to_team_id, asset.player_id]
          );
        } else if (asset.asset_type === 'draft_pick') {
          // Transfer pick ownership
          await client.query(
            `UPDATE draft_pick_ownership SET current_owner_id = $1, updated_at = NOW()
             WHERE season_year = $2 AND round = $3 AND current_owner_id = $4`,
            [asset.to_team_id, asset.pick_year, asset.pick_round, asset.from_team_id]
          );
        }
      }

      // Log executed trade
      await client.query(
        `INSERT INTO executed_trades (trade_proposal_id, season_id, details)
         VALUES ($1, $2, $3)`,
        [tradeId, proposal.season_id, JSON.stringify(assetsResult.rows)]
      );

      // Log transactions
      for (const asset of assetsResult.rows) {
        if (asset.asset_type === 'player' && asset.player_id) {
          await client.query(
            `INSERT INTO transactions (season_id, transaction_type, player_id, team_id, other_team_id, details)
             VALUES ($1, 'trade', $2, $3, $4, $5)`,
            [proposal.season_id, asset.player_id, asset.to_team_id, asset.from_team_id,
             JSON.stringify({ trade_id: tradeId })]
          );
        }
      }

      return { message: 'Trade accepted and executed' };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Accept trade error:', error);
    res.status(500).json({ error: 'Failed to accept trade' });
  }
});

// Reject a trade
router.post('/:tradeId/reject', async (req, res) => {
  try {
    const { tradeId } = req.params;
    const { team_id } = req.body;

    const result = await pool.query(
      `UPDATE trade_proposals SET status = 'rejected', resolved_at = NOW()
       WHERE id = $1 AND $2 = ANY(team_ids) AND status = 'pending'
       RETURNING *`,
      [tradeId, team_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trade not found or not pending' });
    }

    res.json({ message: 'Trade rejected' });
  } catch (error) {
    console.error('Reject trade error:', error);
    res.status(500).json({ error: 'Failed to reject trade' });
  }
});

// Cancel a trade (by proposer)
router.post('/:tradeId/cancel', async (req, res) => {
  try {
    const { tradeId } = req.params;
    const { team_id } = req.body;

    const result = await pool.query(
      `UPDATE trade_proposals SET status = 'cancelled', resolved_at = NOW()
       WHERE id = $1 AND proposed_by_team_id = $2 AND status = 'pending'
       RETURNING *`,
      [tradeId, team_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trade not found or not yours to cancel' });
    }

    res.json({ message: 'Trade cancelled' });
  } catch (error) {
    console.error('Cancel trade error:', error);
    res.status(500).json({ error: 'Failed to cancel trade' });
  }
});

// Get trade history
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const seasonId = await getLatestSeasonId();

    const result = await pool.query(
      `SELECT et.*, tp.summary, tp.team_ids
       FROM executed_trades et
       JOIN trade_proposals tp ON et.trade_proposal_id = tp.id
       WHERE et.season_id = $1
       ORDER BY et.executed_at DESC
       LIMIT $2`,
      [seasonId, limit]
    );

    res.json({ trades: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

export default router;
