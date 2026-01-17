import { Router } from 'express';
import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import { validateTrade, evaluateTradeForTeam, TradeProposal, TradeAsset, TeamTradeContext } from '../trading';
import { SALARY_CAP } from '../freeagency';
import { authMiddleware } from '../auth';
import { withAdvisoryLock, lockPlayer } from '../db/transactions';
import { getLatestSeasonId, getUserActiveFranchise, getSeasonTradeDeadlineDay } from '../db/queries';

const router = Router();

interface TeamRow {
  id: string;
  name: string;
  wins: number | null;
  losses: number | null;
  roster_size: string;
  payroll: string;
}

function buildTeamTradeContext(team: TeamRow): TeamTradeContext {
  const wins = team.wins || 0;
  const payroll = parseInt(team.payroll) || 0;
  return {
    team_id: team.id,
    team_name: team.name,
    wins,
    losses: team.losses || 0,
    payroll,
    cap_space: SALARY_CAP.cap - payroll,
    roster_size: parseInt(team.roster_size) || 0,
    is_contender: wins > 41,
    is_rebuilding: wins < 30,
    positional_needs: []
  };
}

interface DeadlineStatus {
  allowed: boolean;
  message?: string;
  deadline_day?: number;
  current_day?: number;
  days_until?: number;
}

async function checkTradeDeadline(userId: string): Promise<DeadlineStatus> {
  const franchise = await getUserActiveFranchise(userId);
  if (!franchise) {
    return { allowed: false, message: 'No active franchise' };
  }

  const deadlineDay = await getSeasonTradeDeadlineDay(franchise.season_id);
  const currentDay = franchise.current_day || 1;

  if (franchise.phase === 'offseason') {
    return { allowed: true, deadline_day: deadlineDay, current_day: currentDay };
  }

  if (franchise.phase !== 'regular_season') {
    return { allowed: false, message: `Trades not allowed during ${franchise.phase}`, deadline_day: deadlineDay, current_day: currentDay };
  }

  if (currentDay > deadlineDay) {
    return { allowed: false, message: 'Trade deadline has passed', deadline_day: deadlineDay, current_day: currentDay };
  }

  return { allowed: true, deadline_day: deadlineDay, current_day: currentDay, days_until: deadlineDay - currentDay };
}

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

router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Single query to get proposals with all assets via JSON aggregation
    const result = await pool.query(
      `SELECT tp.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ta.id,
                    'trade_id', ta.trade_id,
                    'from_team_id', ta.from_team_id,
                    'to_team_id', ta.to_team_id,
                    'asset_type', ta.asset_type,
                    'player_id', ta.player_id,
                    'pick_year', ta.pick_year,
                    'pick_round', ta.pick_round,
                    'cash_amount', ta.cash_amount,
                    'first_name', p.first_name,
                    'last_name', p.last_name,
                    'position', p.position,
                    'overall', p.overall,
                    'age', p.age,
                    'from_team_name', t_from.name,
                    'from_abbrev', t_from.abbreviation,
                    'to_team_name', t_to.name,
                    'to_abbrev', t_to.abbreviation
                  )
                ) FILTER (WHERE ta.id IS NOT NULL),
                '[]'
              ) as assets
       FROM trade_proposals tp
       LEFT JOIN trade_assets ta ON tp.id = ta.trade_id
       LEFT JOIN players p ON ta.player_id = p.id
       LEFT JOIN teams t_from ON ta.from_team_id = t_from.id
       LEFT JOIN teams t_to ON ta.to_team_id = t_to.id
       WHERE $1 = ANY(tp.team_ids) AND tp.status = 'pending'
       GROUP BY tp.id
       ORDER BY tp.proposed_at DESC`,
      [teamId]
    );

    res.json({ proposals: result.rows });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trade proposals' });
  }
});

router.post('/propose', authMiddleware(true), async (req: any, res) => {
  try {
    const { from_team_id, to_team_id, assets } = req.body;

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

    const seasonId = await getLatestSeasonId();

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
      teamsMap.set(team.id, buildTeamTradeContext(team));
    }

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

    const validation = validateTrade(proposal, teamsMap, playersMap);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid trade', validation_errors: validation.errors, warnings: validation.warnings });
    }

    const tradeId = uuidv4();
    await pool.query(
      `INSERT INTO trade_proposals
       (id, season_id, team_ids, proposed_by_team_id, status, is_valid, validation_errors, summary)
       VALUES ($1, $2, $3, $4, 'pending', true, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [tradeId, seasonId, [from_team_id, to_team_id], from_team_id,
       validation.warnings, `Trade between ${teamsMap.get(from_team_id)?.team_name} and ${teamsMap.get(to_team_id)?.team_name}`]
    );

    // Batch insert all assets in single query
    if (assets.length > 0) {
      const assetValues = assets.map((a: any) => [
        tradeId, a.from_team_id, a.to_team_id, a.asset_type || 'player',
        a.player_id || null, a.pick_year || null, a.pick_round || null,
        a.pick_original_team_id || null, a.cash_amount || null
      ]);
      const placeholders = assetValues.map((_: any, i: number) =>
        `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`
      ).join(', ');
      await pool.query(
        `INSERT INTO trade_assets
         (trade_id, from_team_id, to_team_id, asset_type, player_id, pick_year, pick_round, pick_original_team_id, cash_amount)
         VALUES ${placeholders}
         ON CONFLICT (id) DO NOTHING`,
        assetValues.flat()
      );
    }

    res.json({ message: 'Trade proposed', trade_id: tradeId, warnings: validation.warnings });
  } catch (error) {
    console.error('Propose trade error:', error);
    res.status(500).json({ error: 'Failed to propose trade' });
  }
});

router.get('/:tradeId/evaluate/:teamId', async (req, res) => {
  try {
    const { tradeId, teamId } = req.params;

    const proposalResult = await pool.query(`SELECT * FROM trade_proposals WHERE id = $1`, [tradeId]);
    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    const proposal = proposalResult.rows[0];

    const assetsResult = await pool.query(
      `SELECT ta.*, p.overall, p.potential, p.age, p.salary
       FROM trade_assets ta
       LEFT JOIN players p ON ta.player_id = p.id
       WHERE ta.trade_id = $1`,
      [tradeId]
    );

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

    const seasonResult = await pool.query(`SELECT season_number FROM seasons ORDER BY season_number DESC LIMIT 1`);
    const currentYear = 2024 + (seasonResult.rows[0]?.season_number || 1);

    const evaluation = evaluateTradeForTeam(teamId, tradeProposal, buildTeamTradeContext(teamResult.rows[0]), currentYear);
    res.json({ evaluation });
  } catch (error) {
    console.error('Evaluate trade error:', error);
    res.status(500).json({ error: 'Failed to evaluate trade' });
  }
});

router.post('/:tradeId/accept', authMiddleware(true), async (req: any, res) => {
  try {
    const { tradeId } = req.params;
    const { team_id } = req.body;

    const deadlineStatus = await checkTradeDeadline(req.user.userId);
    if (!deadlineStatus.allowed) {
      return res.status(403).json({
        error: deadlineStatus.message || 'Trades not allowed',
        deadline_day: deadlineStatus.deadline_day,
        current_day: deadlineStatus.current_day
      });
    }

    const result = await withAdvisoryLock(`trade-${tradeId}`, async (client) => {
      const proposalResult = await client.query(
        `UPDATE trade_proposals SET status = 'accepted', resolved_at = NOW()
         WHERE id = $1 AND status = 'pending' RETURNING *`,
        [tradeId]
      );
      if (proposalResult.rows.length === 0) {
        throw { status: 404, message: 'Trade not found or not pending' };
      }
      const proposal = proposalResult.rows[0];

      if (!proposal.team_ids.includes(team_id)) {
        throw { status: 403, message: 'Team not part of this trade' };
      }
      if (proposal.proposed_by_team_id === team_id) {
        throw { status: 400, message: 'Cannot accept own proposal' };
      }

      const assetsResult = await client.query(`SELECT * FROM trade_assets WHERE trade_id = $1`, [tradeId]);

      for (const asset of assetsResult.rows) {
        if (asset.asset_type === 'player' && asset.player_id) {
          const player = await lockPlayer(client, asset.player_id);
          if (!player) {
            throw { status: 400, message: `Player ${asset.player_id} not found` };
          }
          if (player.team_id !== asset.from_team_id) {
            throw { status: 400, message: 'Player is no longer on the expected team - trade invalid' };
          }
        }
      }

      for (const asset of assetsResult.rows) {
        if (asset.asset_type === 'player' && asset.player_id) {
          await client.query(`UPDATE players SET team_id = $1, last_traded_at = NOW() WHERE id = $2`, [asset.to_team_id, asset.player_id]);
          await client.query(`UPDATE contracts SET team_id = $1, updated_at = NOW() WHERE player_id = $2 AND status = 'active'`, [asset.to_team_id, asset.player_id]);
        } else if (asset.asset_type === 'draft_pick') {
          await client.query(
            `UPDATE draft_pick_ownership SET current_owner_id = $1, updated_at = NOW()
             WHERE season_year = $2 AND round = $3 AND current_owner_id = $4`,
            [asset.to_team_id, asset.pick_year, asset.pick_round, asset.from_team_id]
          );
        }
      }

      await client.query(
        `INSERT INTO executed_trades (trade_proposal_id, season_id, details) VALUES ($1, $2, $3)`,
        [tradeId, proposal.season_id, JSON.stringify(assetsResult.rows)]
      );

      for (const asset of assetsResult.rows) {
        if (asset.asset_type === 'player' && asset.player_id) {
          await client.query(
            `INSERT INTO transactions (season_id, transaction_type, player_id, team_id, other_team_id, details)
             VALUES ($1, 'trade', $2, $3, $4, $5)`,
            [proposal.season_id, asset.player_id, asset.to_team_id, asset.from_team_id, JSON.stringify({ trade_id: tradeId })]
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

router.post('/:tradeId/reject', authMiddleware(true), async (req: any, res) => {
  try {
    const { tradeId } = req.params;
    const { team_id } = req.body;

    const result = await pool.query(
      `UPDATE trade_proposals SET status = 'rejected', resolved_at = NOW()
       WHERE id = $1 AND $2 = ANY(team_ids) AND status = 'pending' RETURNING *`,
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

router.post('/:tradeId/cancel', authMiddleware(true), async (req: any, res) => {
  try {
    const { tradeId } = req.params;
    const { team_id } = req.body;

    const result = await pool.query(
      `UPDATE trade_proposals SET status = 'cancelled', resolved_at = NOW()
       WHERE id = $1 AND proposed_by_team_id = $2 AND status = 'pending' RETURNING *`,
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
