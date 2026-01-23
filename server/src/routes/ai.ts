import { Router } from 'express';
import { pool } from '../db/pool';
import { withTransaction } from '../db/transactions';
import { generateYearlySalaries } from '../freeagency';
import { getLatestSeasonId } from '../db/queries';
import { authMiddleware } from '../auth';
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

async function getTeamContext(teamId: string, seasonId: string): Promise<CPUTeamContext | null> {
  const contexts = await getMultipleTeamContexts([teamId], seasonId);
  return contexts.get(teamId) || null;
}

async function getMultipleTeamContexts(teamIds: string[], seasonId: string): Promise<Map<string, CPUTeamContext>> {
  if (teamIds.length === 0) return new Map();

  // Single query to get all team data with aggregated stats
  const teamsResult = await pool.query(
    `SELECT t.id, t.name,
            s.wins, s.losses,
            (SELECT COALESCE(salary_cap, 140000000) FROM salary_cap_settings WHERE season_id = $2 LIMIT 1) as salary_cap
     FROM teams t
     LEFT JOIN standings s ON t.id = s.team_id AND s.season_id = $2
     WHERE t.id = ANY($1)`,
    [teamIds, seasonId]
  );

  // Single query for all player stats aggregated by team
  const playerStatsResult = await pool.query(
    `SELECT team_id,
            COUNT(*) as roster_size,
            COALESCE(AVG(age), 25) as avg_age,
            COALESCE(AVG(overall), 70) as avg_overall,
            COUNT(*) FILTER (WHERE overall >= 80) as star_count,
            COUNT(*) FILTER (WHERE age < 25 AND potential >= 75) as young_talent,
            (SELECT COALESCE(SUM(c.base_salary), 0) FROM contracts c WHERE c.team_id = players.team_id AND c.status = 'active') as payroll
     FROM players
     WHERE team_id = ANY($1)
     GROUP BY team_id`,
    [teamIds]
  );

  // Single query for positional data
  const rosterResult = await pool.query(
    `SELECT team_id, position, overall, age FROM players WHERE team_id = ANY($1)`,
    [teamIds]
  );

  // Build lookup maps
  const playerStatsMap = new Map<string, any>();
  for (const stats of playerStatsResult.rows) {
    playerStatsMap.set(stats.team_id, stats);
  }

  const rosterMap = new Map<string, any[]>();
  for (const player of rosterResult.rows) {
    if (!rosterMap.has(player.team_id)) {
      rosterMap.set(player.team_id, []);
    }
    rosterMap.get(player.team_id)!.push(player);
  }

  // Build context for each team
  const contexts = new Map<string, CPUTeamContext>();
  for (const team of teamsResult.rows) {
    const wins = team.wins || 0;
    const losses = team.losses || 0;
    const salaryCap = parseInt(team.salary_cap) || 140000000;
    const playerStats = playerStatsMap.get(team.id) || {};
    const payroll = parseInt(playerStats.payroll) || 0;
    const starCount = parseInt(playerStats.star_count) || 0;
    const avgAge = parseFloat(playerStats.avg_age) || 25;

    contexts.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      wins,
      losses,
      win_pct: wins + losses > 0 ? wins / (wins + losses) : 0.5,
      payroll,
      cap_space: salaryCap - payroll,
      roster_size: parseInt(playerStats.roster_size) || 0,
      avg_age: avgAge,
      avg_overall: parseFloat(playerStats.avg_overall) || 70,
      star_count: starCount,
      young_talent: parseInt(playerStats.young_talent) || 0,
      championship_window: starCount >= 2 && avgAge <= 30,
      positional_needs: analyzePositionalNeeds(rosterMap.get(team.id) || [])
    });
  }

  return contexts;
}

router.get('/team/:teamId/analysis', authMiddleware(true), async (req: any, res) => {
  try {
    const { teamId } = req.params;
    const seasonId = await getLatestSeasonId();
    if (!seasonId) return res.status(400).json({ error: 'No active season' });

    const context = await getTeamContext(teamId, seasonId);
    if (!context) return res.status(404).json({ error: 'Team not found' });

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
  }

  if (strategy === 'rebuilding') {
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

router.post('/process/:phase', authMiddleware(true), async (req: any, res) => {
  try {
    const { phase } = req.params;
    const { user_team_id } = req.body;
    const seasonId = await getLatestSeasonId();
    if (!seasonId) return res.status(400).json({ error: 'No active season' });

    const teamsResult = await pool.query(
      `SELECT id FROM teams WHERE id != $1`,
      [user_team_id || '']
    );

    const teamIds = teamsResult.rows.map(t => t.id);
    const contexts = await getMultipleTeamContexts(teamIds, seasonId);

    const actions: any[] = [];
    const canTrade = phase === 'offseason' || phase === 'regular_season';
    const canSignFA = phase === 'offseason' || phase === 'regular_season';

    // Batch fetch trade offers for all teams (single query)
    let tradeOffersByTeam = new Map<string, any[]>();
    if (canTrade && teamIds.length > 0) {
      const tradeResult = await pool.query(
        `SELECT * FROM trade_proposals WHERE status = 'pending' AND team_ids && $1`,
        [teamIds]
      );
      for (const trade of tradeResult.rows) {
        for (const teamId of trade.team_ids) {
          if (!tradeOffersByTeam.has(teamId)) {
            tradeOffersByTeam.set(teamId, []);
          }
          tradeOffersByTeam.get(teamId)!.push(trade);
        }
      }
    }

    // Single FA query (same for all teams)
    let freeAgents: any[] = [];
    if (canSignFA) {
      const faResult = await pool.query(
        `SELECT p.id, p.position, p.overall, p.age, p.potential, fa.asking_salary
         FROM players p
         LEFT JOIN free_agents fa ON p.id = fa.player_id
         WHERE p.team_id IS NULL
         ORDER BY p.overall DESC
         LIMIT 20`
      );
      freeAgents = faResult.rows;
    }

    for (const teamId of teamIds) {
      const context = contexts.get(teamId);
      if (!context) continue;

      const options: any = {
        canTrade,
        canSignFA,
        canDraft: phase === 'draft',
        tradeOffers: tradeOffersByTeam.get(teamId) || [],
        freeAgents
      };

      const decisions = generateCPUActions(context, options);

      for (const decision of decisions.slice(0, 3)) {
        actions.push({ team_id: teamId, team_name: context.team_name, ...decision });

        if (decision.type === 'trade' && decision.details.action === 'accept') {
          await pool.query(
            `UPDATE trade_proposals SET status = 'accepted', resolved_at = NOW() WHERE id = $1`,
            [decision.details.trade_id]
          );
        }
      }
    }

    res.json({ message: 'CPU actions processed', phase, actions_taken: actions.length, actions });
  } catch (error) {
    console.error('CPU process error:', error);
    res.status(500).json({ error: 'Failed to process CPU actions' });
  }
});

router.post('/draft/pick', authMiddleware(true), async (req: any, res) => {
  try {
    const { team_id, pick_number } = req.body;
    const seasonId = await getLatestSeasonId();
    if (!seasonId) return res.status(400).json({ error: 'No active season' });

    const context = await getTeamContext(team_id, seasonId);
    if (!context) return res.status(404).json({ error: 'Team not found' });

    const prospectsResult = await pool.query(
      `SELECT id, position, overall, potential, mock_draft_position, big_board_rank
       FROM draft_prospects
       WHERE season_id = $1 AND is_drafted = false
       ORDER BY mock_draft_position`,
      [seasonId]
    );

    const decision = selectDraftPick(context, prospectsResult.rows, pick_number);
    if (!decision.prospectId) return res.status(400).json({ error: 'No prospects available' });

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

async function signFreeAgentForCPU(playerId: string, teamId: string, salary: number, years: number): Promise<boolean> {
  try {
    return await withTransaction(async (client) => {
      const claimResult = await client.query(
        `UPDATE players SET team_id = $1, salary = $2 WHERE id = $3 AND team_id IS NULL RETURNING *`,
        [teamId, salary, playerId]
      );
      if (claimResult.rows.length === 0) return false;

      const salaries = generateYearlySalaries(salary, years);
      await client.query(
        `INSERT INTO contracts (player_id, team_id, total_years, years_remaining, base_salary,
          year_1_salary, year_2_salary, year_3_salary, year_4_salary, year_5_salary, contract_type, status)
         VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, 'standard', 'active')
         ON CONFLICT (player_id) DO UPDATE SET
           team_id = $2, total_years = $3, years_remaining = $3, base_salary = $4,
           year_1_salary = $5, year_2_salary = $6, year_3_salary = $7, year_4_salary = $8, year_5_salary = $9, status = 'active'`,
        [playerId, teamId, years, salary,
         salaries[0], salaries[1] || null, salaries[2] || null, salaries[3] || null, salaries[4] || null]
      );
      return true;
    });
  } catch (error) {
    console.error('CPU signing failed:', error);
    return false;
  }
}

function getContractYears(age: number): number {
  if (age < 25) return 4;
  if (age < 30) return 3;
  return 2;
}

router.post('/freeagency', authMiddleware(true), async (req: any, res) => {
  try {
    const { user_team_id } = req.body;
    const seasonId = await getLatestSeasonId();
    if (!seasonId) return res.status(400).json({ error: 'No active season' });

    const teamsResult = await pool.query(
      `SELECT id FROM teams WHERE id != $1 ORDER BY RANDOM()`,
      [user_team_id || '']
    );

    const teamIds = teamsResult.rows.map(t => t.id);
    const contexts = await getMultipleTeamContexts(teamIds, seasonId);

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

    for (const teamId of teamIds) {
      const context = contexts.get(teamId);
      if (!context || context.roster_size >= 15) continue;

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
          const signed = await signFreeAgentForCPU(fa.id, teamId, evaluation.maxOffer, getContractYears(fa.age));

          if (signed) {
            signings.push({
              team_id: teamId,
              team_name: context.team_name,
              player_id: fa.id,
              player_name: `${fa.first_name} ${fa.last_name}`,
              salary: evaluation.maxOffer,
              reasoning: evaluation.reasoning
            });
            signedPlayerIds.add(fa.id);
            break;
          }
        }
      }
    }

    res.json({ message: 'CPU free agency processed', signings_count: signings.length, signings });
  } catch (error) {
    console.error('CPU FA error:', error);
    res.status(500).json({ error: 'Failed to process CPU free agency' });
  }
});

async function executeTradeAtomic(
  tradeId: string,
  proposingTeamId: string,
  receivingTeamId: string,
  playersOffered: string[],
  playersRequested: string[]
): Promise<boolean> {
  try {
    return await withTransaction(async (client) => {
      const claimResult = await client.query(
        `UPDATE trade_proposals SET status = 'accepted', resolved_at = NOW()
         WHERE id = $1 AND status = 'pending' RETURNING *`,
        [tradeId]
      );
      if (claimResult.rows.length === 0) return false;

      for (const playerId of playersOffered) {
        await client.query(`UPDATE players SET team_id = $1 WHERE id = $2`, [receivingTeamId, playerId]);
      }
      for (const playerId of playersRequested) {
        await client.query(`UPDATE players SET team_id = $1 WHERE id = $2`, [proposingTeamId, playerId]);
      }
      return true;
    });
  } catch (error) {
    console.error('Trade execution failed:', error);
    return false;
  }
}

router.post('/trades', authMiddleware(true), async (req: any, res) => {
  try {
    const { user_team_id } = req.body;
    const seasonId = await getLatestSeasonId();
    if (!seasonId) return res.status(400).json({ error: 'No active season' });

    const tradesResult = await pool.query(
      `SELECT tp.*, prop_t.name as proposing_team_name, recv_t.name as receiving_team_name
       FROM trade_proposals tp
       JOIN teams prop_t ON tp.proposing_team_id = prop_t.id
       JOIN teams recv_t ON tp.receiving_team_id = recv_t.id
       WHERE tp.status = 'pending' AND tp.receiving_team_id != $1`,
      [user_team_id || '']
    );

    if (tradesResult.rows.length === 0) {
      return res.json({ message: 'CPU trade responses processed', responses_count: 0, responses: [] });
    }

    // Batch fetch all team contexts and player data
    const receivingTeamIds = [...new Set(tradesResult.rows.map(t => t.receiving_team_id))];
    const contexts = await getMultipleTeamContexts(receivingTeamIds, seasonId);

    // Collect all player IDs from all trades for batch fetch
    const allPlayerIds = new Set<string>();
    for (const trade of tradesResult.rows) {
      (trade.players_offered || []).forEach((id: string) => allPlayerIds.add(id));
      (trade.players_requested || []).forEach((id: string) => allPlayerIds.add(id));
    }

    const playersMap = new Map<string, any>();
    if (allPlayerIds.size > 0) {
      const playersResult = await pool.query(
        `SELECT id, overall, age, potential, salary FROM players WHERE id = ANY($1)`,
        [[...allPlayerIds]]
      );
      for (const p of playersResult.rows) {
        playersMap.set(p.id, { overall: p.overall, age: p.age, potential: p.potential, salary: p.salary || 0 });
      }
    }

    const responses: any[] = [];

    for (const trade of tradesResult.rows) {
      const context = contexts.get(trade.receiving_team_id);
      if (!context) continue;

      const offeredPlayers = (trade.players_offered || []).map((id: string) => playersMap.get(id)).filter(Boolean);
      const requestedPlayers = (trade.players_requested || []).map((id: string) => playersMap.get(id)).filter(Boolean);

      const evaluation = evaluateIncomingTrade(context, offeredPlayers, requestedPlayers, [], []);

      if (evaluation.accept) {
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
      } else if (Math.random() < 0.7) {
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

    res.json({ message: 'CPU trade responses processed', responses_count: responses.length, responses });
  } catch (error) {
    console.error('CPU trades error:', error);
    res.status(500).json({ error: 'Failed to process CPU trades' });
  }
});

router.post('/lineup/:teamId', authMiddleware(true), async (req: any, res) => {
  try {
    const { teamId } = req.params;
    const rosterResult = await pool.query(
      `SELECT id, position, overall, stamina FROM players WHERE team_id = $1`,
      [teamId]
    );
    const decision = selectStarters(rosterResult.rows);
    res.json({ team_id: teamId, starters: decision.starters, reasoning: decision.reasoning });
  } catch (error) {
    console.error('CPU lineup error:', error);
    res.status(500).json({ error: 'Failed to set lineup' });
  }
});

export default router;
