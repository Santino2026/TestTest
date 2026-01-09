// CPU AI API Routes
import { Router } from 'express';
import { pool } from '../db/pool';
import { withTransaction } from '../db/transactions';
import { getLatestSeasonId } from '../db/queries';
import {
  CPUTeamContext,
  determineTeamStrategy,
  analyzePositionalNeeds,
  evaluateIncomingTrade,
  evaluateFreeAgentTarget,
  selectDraftPick,
  selectStarters,
  generateCPUActions
} from '../ai';

const router = Router();

// Get team context for AI decisions
async function getTeamContext(teamId: string, seasonId: string): Promise<CPUTeamContext | null> {
  const teamResult = await pool.query(
    `SELECT t.id, t.name,
            s.wins, s.losses,
            (SELECT COUNT(*) FROM players WHERE team_id = t.id) as roster_size,
            (SELECT COALESCE(AVG(age), 25) FROM players WHERE team_id = t.id) as avg_age,
            (SELECT COALESCE(AVG(overall), 70) FROM players WHERE team_id = t.id) as avg_overall,
            (SELECT COUNT(*) FROM players WHERE team_id = t.id AND overall >= 80) as star_count,
            (SELECT COUNT(*) FROM players WHERE team_id = t.id AND age < 25 AND potential >= 75) as young_talent,
            (SELECT COALESCE(SUM(salary), 0) FROM players WHERE team_id = t.id) as payroll
     FROM teams t
     LEFT JOIN standings s ON t.id = s.team_id AND s.season_id = $2
     WHERE t.id = $1`,
    [teamId, seasonId]
  );

  if (teamResult.rows.length === 0) return null;

  const team = teamResult.rows[0];
  const wins = team.wins || 0;
  const losses = team.losses || 0;
  const payroll = parseInt(team.payroll) || 0;
  const capSpace = 140000000 - payroll;

  // Get roster for positional analysis
  const rosterResult = await pool.query(
    `SELECT position, overall, age FROM players WHERE team_id = $1`,
    [teamId]
  );

  const positionalNeeds = analyzePositionalNeeds(rosterResult.rows);

  return {
    team_id: team.id,
    team_name: team.name,
    wins,
    losses,
    win_pct: wins + losses > 0 ? wins / (wins + losses) : 0.5,
    payroll,
    cap_space: capSpace,
    roster_size: parseInt(team.roster_size) || 0,
    avg_age: parseFloat(team.avg_age) || 25,
    avg_overall: parseFloat(team.avg_overall) || 70,
    star_count: parseInt(team.star_count) || 0,
    young_talent: parseInt(team.young_talent) || 0,
    championship_window: parseInt(team.star_count) >= 2 && parseFloat(team.avg_age) <= 30,
    positional_needs: positionalNeeds
  };
}

// Get AI analysis for a team
router.get('/team/:teamId/analysis', async (req, res) => {
  try {
    const { teamId } = req.params;

    const seasonId = await getLatestSeasonId();
    if (!seasonId) {
      return res.status(400).json({ error: 'No active season' });
    }

    const context = await getTeamContext(teamId, seasonId);

    if (!context) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const strategy = determineTeamStrategy(context);

    res.json({
      team_id: teamId,
      context,
      strategy,
      analysis: {
        is_contender: strategy === 'contending',
        is_rebuilding: strategy === 'rebuilding',
        needs: context.positional_needs,
        recommendations: getRecommendations(context, strategy)
      }
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: 'Failed to get team analysis' });
  }
});

function getRecommendations(context: CPUTeamContext, strategy: string): string[] {
  const recs: string[] = [];

  if (context.positional_needs.length > 0) {
    recs.push(`Target players at: ${context.positional_needs.join(', ')}`);
  }

  if (strategy === 'contending') {
    recs.push('Focus on adding veteran contributors');
    if (context.cap_space > 10000000) {
      recs.push('Use cap space to add talent for playoff push');
    }
  } else if (strategy === 'rebuilding') {
    recs.push('Prioritize draft picks and young players');
    recs.push('Consider trading veterans for future assets');
    if (context.star_count >= 1) {
      recs.push('Consider trading star for haul of picks');
    }
  }

  if (context.roster_size < 12) {
    recs.push('Need to add players - roster below minimum');
  } else if (context.roster_size > 14) {
    recs.push('Roster nearly full - be selective with additions');
  }

  return recs;
}

// Process CPU team actions for a game phase
router.post('/process/:phase', async (req, res) => {
  try {
    const { phase } = req.params;
    const { user_team_id } = req.body;

    const seasonId = await getLatestSeasonId();
    if (!seasonId) {
      return res.status(400).json({ error: 'No active season' });
    }

    // Get all CPU teams (exclude user's team)
    const teamsResult = await pool.query(
      `SELECT id FROM teams WHERE id != $1`,
      [user_team_id || '']
    );

    const actions: any[] = [];

    for (const team of teamsResult.rows) {
      const context = await getTeamContext(team.id, seasonId);
      if (!context) continue;

      const options: any = {
        canTrade: phase === 'offseason' || phase === 'regular_season',
        canSignFA: phase === 'offseason' || phase === 'regular_season',
        canDraft: phase === 'draft'
      };

      // Get trade offers for this team
      if (options.canTrade) {
        const tradeResult = await pool.query(
          `SELECT * FROM trade_proposals WHERE $1 = ANY(team_ids) AND status = 'pending'`,
          [team.id]
        );
        options.tradeOffers = tradeResult.rows;
      }

      // Get free agents if can sign
      if (options.canSignFA) {
        const faResult = await pool.query(
          `SELECT p.id, p.position, p.overall, p.age, p.potential,
                  fa.asking_salary
           FROM players p
           LEFT JOIN free_agents fa ON p.id = fa.player_id
           WHERE p.team_id IS NULL
           ORDER BY p.overall DESC
           LIMIT 20`
        );
        options.freeAgents = faResult.rows;
      }

      const decisions = generateCPUActions(context, options);

      // Process top 3 decisions
      for (const decision of decisions.slice(0, 3)) {
        actions.push({
          team_id: team.id,
          team_name: context.team_name,
          ...decision
        });

        // Actually execute some decisions
        if (decision.type === 'trade' && decision.details.action === 'accept') {
          // Accept the trade
          await pool.query(
            `UPDATE trade_proposals SET status = 'accepted', resolved_at = NOW() WHERE id = $1`,
            [decision.details.trade_id]
          );
        }
      }
    }

    res.json({
      message: 'CPU actions processed',
      phase,
      actions_taken: actions.length,
      actions
    });
  } catch (error) {
    console.error('CPU process error:', error);
    res.status(500).json({ error: 'Failed to process CPU actions' });
  }
});

// Have CPU make draft pick
router.post('/draft/pick', async (req, res) => {
  try {
    const { team_id, pick_number } = req.body;

    const seasonId = await getLatestSeasonId();
    if (!seasonId) {
      return res.status(400).json({ error: 'No active season' });
    }

    // Get team context
    const context = await getTeamContext(team_id, seasonId);

    if (!context) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get available prospects
    const prospectsResult = await pool.query(
      `SELECT id, position, overall, potential, mock_draft_position, big_board_rank
       FROM draft_prospects
       WHERE season_id = $1 AND is_drafted = false
       ORDER BY mock_draft_position`,
      [seasonId]
    );

    const decision = selectDraftPick(context, prospectsResult.rows, pick_number);

    if (!decision.prospectId) {
      return res.status(400).json({ error: 'No prospects available' });
    }

    res.json({
      message: 'Draft pick selected',
      team_id,
      pick_number,
      selected_prospect_id: decision.prospectId,
      reasoning: decision.reasoning
    });
  } catch (error) {
    console.error('CPU draft error:', error);
    res.status(500).json({ error: 'Failed to make draft pick' });
  }
});

// Helper function to atomically sign a free agent for CPU
async function signFreeAgentForCPU(
  playerId: string,
  teamId: string,
  salary: number,
  years: number
): Promise<boolean> {
  try {
    return await withTransaction(async (client) => {
      // Atomically claim the player - prevents double-signing
      const claimResult = await client.query(
        `UPDATE players SET team_id = $1, salary = $2
         WHERE id = $3 AND team_id IS NULL
         RETURNING *`,
        [teamId, salary, playerId]
      );

      if (claimResult.rows.length === 0) {
        return false; // Player already signed
      }

      // Create contract
      await client.query(
        `INSERT INTO contracts (player_id, team_id, total_years, years_remaining, base_salary, year_1_salary, contract_type, status)
         VALUES ($1, $2, $3, $3, $4, $4, 'standard', 'active')
         ON CONFLICT (player_id) DO UPDATE SET
           team_id = $2, total_years = $3, years_remaining = $3, base_salary = $4, year_1_salary = $4, status = 'active'`,
        [playerId, teamId, years, salary]
      );

      return true;
    });
  } catch (error) {
    console.error('CPU signing failed:', error);
    return false;
  }
}

// Process CPU free agency signings
router.post('/freeagency', async (req, res) => {
  try {
    const { user_team_id } = req.body;

    const seasonId = await getLatestSeasonId();
    if (!seasonId) {
      return res.status(400).json({ error: 'No active season' });
    }

    // Get all CPU teams (exclude user's team)
    const teamsResult = await pool.query(
      `SELECT id FROM teams WHERE id != $1 ORDER BY RANDOM()`,
      [user_team_id || '']
    );

    // Get available free agents
    const faResult = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, p.position, p.overall, p.age, p.potential,
              COALESCE(fa.asking_salary, p.overall * 100000) as asking_salary
       FROM players p
       LEFT JOIN free_agents fa ON p.id = fa.player_id
       WHERE p.team_id IS NULL
       ORDER BY p.overall DESC
       LIMIT 50`
    );

    const signings: any[] = [];
    const signedPlayerIds = new Set<string>();

    for (const team of teamsResult.rows) {
      const context = await getTeamContext(team.id, seasonId);
      if (!context) continue;

      // Skip if roster is full
      if (context.roster_size >= 15) continue;

      const strategy = determineTeamStrategy(context);

      // Find a suitable free agent
      for (const fa of faResult.rows) {
        if (signedPlayerIds.has(fa.id)) continue;

        const evaluation = evaluateFreeAgentTarget(context, {
          position: fa.position,
          overall: fa.overall,
          age: fa.age,
          potential: fa.potential,
          asking_salary: fa.asking_salary
        });

        if (evaluation.interested && evaluation.maxOffer >= fa.asking_salary) {
          // Calculate contract years based on age
          let years: number;
          if (fa.age < 25) {
            years = 4;
          } else if (fa.age < 30) {
            years = 3;
          } else {
            years = 2;
          }

          // Sign the player atomically
          const signed = await signFreeAgentForCPU(fa.id, team.id, evaluation.maxOffer, years);

          if (signed) {
            signings.push({
              team_id: team.id,
              team_name: context.team_name,
              player_id: fa.id,
              player_name: `${fa.first_name} ${fa.last_name}`,
              salary: evaluation.maxOffer,
              reasoning: evaluation.reasoning
            });

            signedPlayerIds.add(fa.id);
            break; // One signing per team per round
          }
          // If signing failed (player already taken), continue to next FA
        }
      }
    }

    res.json({
      message: 'CPU free agency processed',
      signings_count: signings.length,
      signings
    });
  } catch (error) {
    console.error('CPU FA error:', error);
    res.status(500).json({ error: 'Failed to process CPU free agency' });
  }
});

// Helper function to atomically execute a trade
async function executeTradeAtomic(
  tradeId: string,
  proposingTeamId: string,
  receivingTeamId: string,
  playersOffered: string[],
  playersRequested: string[]
): Promise<boolean> {
  try {
    return await withTransaction(async (client) => {
      // Atomically claim the trade - prevents double-execution
      const claimResult = await client.query(
        `UPDATE trade_proposals SET status = 'accepted', resolved_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [tradeId]
      );

      if (claimResult.rows.length === 0) {
        return false; // Trade already processed
      }

      // Move offered players to receiving team
      for (const playerId of playersOffered) {
        await client.query(
          `UPDATE players SET team_id = $1 WHERE id = $2`,
          [receivingTeamId, playerId]
        );
      }

      // Move requested players to proposing team
      for (const playerId of playersRequested) {
        await client.query(
          `UPDATE players SET team_id = $1 WHERE id = $2`,
          [proposingTeamId, playerId]
        );
      }

      return true;
    });
  } catch (error) {
    console.error('Trade execution failed:', error);
    return false;
  }
}

// Process CPU trade responses
router.post('/trades', async (req, res) => {
  try {
    const { user_team_id } = req.body;

    const seasonId = await getLatestSeasonId();
    if (!seasonId) {
      return res.status(400).json({ error: 'No active season' });
    }

    // Get pending trade proposals where CPU is the receiving team
    const tradesResult = await pool.query(
      `SELECT tp.*,
              prop_t.name as proposing_team_name,
              recv_t.name as receiving_team_name
       FROM trade_proposals tp
       JOIN teams prop_t ON tp.proposing_team_id = prop_t.id
       JOIN teams recv_t ON tp.receiving_team_id = recv_t.id
       WHERE tp.status = 'pending' AND tp.receiving_team_id != $1`,
      [user_team_id || '']
    );

    const responses: any[] = [];

    for (const trade of tradesResult.rows) {
      const context = await getTeamContext(trade.receiving_team_id, seasonId);
      if (!context) continue;

      // Get players involved
      const offeredPlayers = await pool.query(
        `SELECT overall, age, potential, salary FROM players WHERE id = ANY($1)`,
        [trade.players_offered || []]
      );
      const requestedPlayers = await pool.query(
        `SELECT overall, age, potential, salary FROM players WHERE id = ANY($1)`,
        [trade.players_requested || []]
      );

      const evaluation = evaluateIncomingTrade(
        context,
        offeredPlayers.rows.map(p => ({
          overall: p.overall,
          age: p.age,
          potential: p.potential,
          salary: p.salary || 0
        })),
        requestedPlayers.rows.map(p => ({
          overall: p.overall,
          age: p.age,
          potential: p.potential,
          salary: p.salary || 0
        })),
        [], []
      );

      if (evaluation.accept) {
        // Execute the trade atomically
        const executed = await executeTradeAtomic(
          trade.id,
          trade.proposing_team_id,
          trade.receiving_team_id,
          trade.players_offered || [],
          trade.players_requested || []
        );

        if (executed) {
          responses.push({
            trade_id: trade.id,
            proposing_team: trade.proposing_team_name,
            receiving_team: trade.receiving_team_name,
            action: 'accepted',
            score: evaluation.score,
            reasoning: evaluation.reasoning
          });
        }
      } else {
        // Reject with some probability (don't instantly reject)
        if (Math.random() < 0.7) { // 70% chance to reject now
          await pool.query(
            `UPDATE trade_proposals SET status = 'rejected', resolved_at = NOW() WHERE id = $1 AND status = 'pending'`,
            [trade.id]
          );

          responses.push({
            trade_id: trade.id,
            proposing_team: trade.proposing_team_name,
            receiving_team: trade.receiving_team_name,
            action: 'rejected',
            score: evaluation.score,
            reasoning: evaluation.reasoning
          });
        }
      }
    }

    res.json({
      message: 'CPU trade responses processed',
      responses_count: responses.length,
      responses
    });
  } catch (error) {
    console.error('CPU trades error:', error);
    res.status(500).json({ error: 'Failed to process CPU trades' });
  }
});

// Have CPU set starting lineup
router.post('/lineup/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Get roster
    const rosterResult = await pool.query(
      `SELECT id, position, overall, stamina FROM players WHERE team_id = $1`,
      [teamId]
    );

    const decision = selectStarters(rosterResult.rows);

    res.json({
      team_id: teamId,
      starters: decision.starters,
      reasoning: decision.reasoning
    });
  } catch (error) {
    console.error('CPU lineup error:', error);
    res.status(500).json({ error: 'Failed to set lineup' });
  }
});

export default router;
