// Free Agency API Routes
import { Router } from 'express';
import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../auth';
import {
  calculateMarketValue,
  canAffordContract,
  createContractFromOffer,
  generateYearlySalaries,
  calculateLuxuryTax,
  SALARY_CAP,
  generateFAPreferences,
  calculateAskingSalary,
  validateOffer,
  scoreOffer,
  TeamContext
} from '../freeagency';
import { withTransaction } from '../db/transactions';
import { getUserActiveFranchise, getLatestSeasonId } from '../db/queries';

const router = Router();

// Check if free agency actions are allowed
function isFreeAgencyAllowed(franchise: any): { allowed: boolean; reason?: string } {
  if (!franchise) {
    return { allowed: false, reason: 'No active franchise' };
  }

  // Allow during regular season (in-season signings)
  if (franchise.phase === 'regular_season') {
    return { allowed: true };
  }

  // Allow during offseason free_agency phase
  if (franchise.phase === 'offseason' && franchise.offseason_phase === 'free_agency') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Free agency is not available in ${franchise.phase} phase${franchise.offseason_phase ? ` (${franchise.offseason_phase})` : ''}`
  };
}

// Get all free agents
router.get('/', async (req, res) => {
  try {
    const seasonId = await getLatestSeasonId();

    const result = await pool.query(
      `SELECT p.*, fa.fa_type, fa.asking_salary, fa.market_value, fa.status as fa_status,
              fa.money_priority, fa.winning_priority, fa.role_priority, fa.market_size_priority
       FROM players p
       LEFT JOIN free_agents fa ON p.id = fa.player_id AND fa.season_id = $1
       WHERE p.team_id IS NULL
       ORDER BY p.overall DESC`,
      [seasonId]
    );

    res.json({ free_agents: result.rows });
  } catch (error) {
    console.error('Free agents error:', error);
    res.status(500).json({ error: 'Failed to fetch free agents' });
  }
});

// Get team salary/cap info
router.get('/team/:teamId/salary', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Get active contracts for team
    const contractsResult = await pool.query(
      `SELECT c.*, p.first_name, p.last_name, p.position, p.overall
       FROM contracts c
       JOIN players p ON c.player_id = p.id
       WHERE c.team_id = $1 AND c.status = 'active'
       ORDER BY c.base_salary DESC`,
      [teamId]
    );

    // Calculate payroll
    const payroll = contractsResult.rows.reduce((sum, c) => {
      // Use current year salary: current_year = total_years - years_remaining + 1
      const currentYear = c.total_years - c.years_remaining + 1;
      const yearSalary = c[`year_${currentYear}_salary`] || c.base_salary;
      return sum + parseInt(yearSalary);
    }, 0);

    // Calculate cap space and tax
    const capSpace = Math.max(0, SALARY_CAP.cap - payroll);
    const luxuryTax = calculateLuxuryTax(payroll);

    res.json({
      team_id: teamId,
      contracts: contractsResult.rows,
      payroll,
      salary_cap: SALARY_CAP.cap,
      cap_space: capSpace,
      luxury_tax_threshold: SALARY_CAP.luxury_tax,
      luxury_tax_owed: luxuryTax,
      over_cap: payroll > SALARY_CAP.cap,
      in_tax: payroll > SALARY_CAP.luxury_tax
    });
  } catch (error) {
    console.error('Team salary error:', error);
    res.status(500).json({ error: 'Failed to fetch team salary' });
  }
});

// Make an offer to a free agent
router.post('/offer', authMiddleware(true), async (req: any, res) => {
  try {
    // Check phase
    const franchise = await getUserActiveFranchise(req.user.userId);
    const phaseCheck = isFreeAgencyAllowed(franchise);
    if (!phaseCheck.allowed) {
      return res.status(400).json({ error: phaseCheck.reason });
    }

    const { team_id, player_id, years, salary_per_year, player_option, team_option, signing_bonus } = req.body;

    if (!team_id || !player_id || !years || !salary_per_year) {
      return res.status(400).json({ error: 'team_id, player_id, years, and salary_per_year required' });
    }

    // Get season
    const seasonId = await getLatestSeasonId();

    // Get player info
    const playerResult = await pool.query(
      `SELECT p.*, fa.asking_salary, fa.market_value, fa.money_priority, fa.winning_priority,
              fa.role_priority, fa.market_size_priority
       FROM players p
       LEFT JOIN free_agents fa ON p.id = fa.player_id
       WHERE p.id = $1 AND p.team_id IS NULL`,
      [player_id]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Free agent not found' });
    }

    const player = playerResult.rows[0];

    // Get team info
    const teamResult = await pool.query(
      `SELECT t.*, s.wins, s.losses,
              (SELECT COUNT(*) FROM players WHERE team_id = t.id) as roster_size,
              (SELECT COALESCE(SUM(c.base_salary), 0) FROM contracts c WHERE c.team_id = t.id AND c.status = 'active') as payroll
       FROM teams t
       LEFT JOIN standings s ON t.id = s.team_id
       WHERE t.id = $1`,
      [team_id]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = teamResult.rows[0];

    // Validate offer
    const validation = validateOffer(
      { payroll: parseInt(team.payroll), roster_size: parseInt(team.roster_size) },
      { team_id, player_id, years, salary_per_year, total_value: salary_per_year * years },
      { market_value: player.market_value || calculateMarketValue(player.overall, player.age, player.years_pro, player.potential) } as any
    );

    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', '), warnings: validation.warnings });
    }

    // Create offer record
    const offerId = uuidv4();
    await pool.query(
      `INSERT INTO contract_offers
       (id, player_id, team_id, season_id, years, salary_per_year, total_value,
        player_option, team_option, signing_bonus, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW() + INTERVAL '7 days')`,
      [offerId, player_id, team_id, seasonId, years, salary_per_year, salary_per_year * years,
       player_option || false, team_option || false, signing_bonus || 0]
    );

    res.json({
      message: 'Offer submitted',
      offer_id: offerId,
      warnings: validation.warnings
    });
  } catch (error) {
    console.error('Make offer error:', error);
    res.status(500).json({ error: 'Failed to make offer' });
  }
});

// Sign a free agent (user accepting or FA accepting)
router.post('/sign', authMiddleware(true), async (req: any, res) => {
  try {
    // Check phase
    const franchise = await getUserActiveFranchise(req.user.userId);
    const phaseCheck = isFreeAgencyAllowed(franchise);
    if (!phaseCheck.allowed) {
      return res.status(400).json({ error: phaseCheck.reason });
    }

    const { team_id, player_id, years, salary_per_year } = req.body;

    if (!team_id || !player_id || !years || !salary_per_year) {
      return res.status(400).json({ error: 'team_id, player_id, years, and salary_per_year required' });
    }

    const result = await withTransaction(async (client) => {
      // Get season
      const seasonId = await getLatestSeasonId(client);

      // Atomically claim the player - prevents double-signing
      const claimResult = await client.query(
        `UPDATE players SET team_id = $1, salary = $2
         WHERE id = $3 AND team_id IS NULL
         RETURNING *`,
        [team_id, salary_per_year, player_id]
      );

      if (claimResult.rows.length === 0) {
        throw { status: 400, message: 'Player is not a free agent or was already signed' };
      }

      const player = claimResult.rows[0];

      // Verify team roster space
      const rosterResult = await client.query(
        `SELECT COUNT(*) FROM players WHERE team_id = $1`,
        [team_id]
      );

      if (parseInt(rosterResult.rows[0].count) > 15) {
        // Rollback by throwing - transaction will be rolled back
        throw { status: 400, message: 'Roster is full (15 players max)' };
      }

      // Generate contract salaries
      const salaries = generateYearlySalaries(salary_per_year, years);

      // Create contract
      const contractId = uuidv4();
      await client.query(
        `INSERT INTO contracts
         (id, player_id, team_id, total_years, years_remaining, base_salary,
          year_1_salary, year_2_salary, year_3_salary, year_4_salary, year_5_salary,
          contract_type, status, start_season_id)
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, 'standard', 'active', $11)`,
        [contractId, player_id, team_id, years, salary_per_year,
         salaries[0], salaries[1] || null, salaries[2] || null, salaries[3] || null, salaries[4] || null,
         seasonId]
      );

      // Update free agent record
      await client.query(
        `UPDATE free_agents SET status = 'signed', signed_at = NOW() WHERE player_id = $1 AND season_id = $2`,
        [player_id, seasonId]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (season_id, transaction_type, player_id, team_id, contract_id, details)
         VALUES ($1, 'signing', $2, $3, $4, $5)`,
        [seasonId, player_id, team_id, contractId, JSON.stringify({ years, salary: salary_per_year })]
      );

      // Get team name for response
      const teamResult = await client.query(`SELECT name FROM teams WHERE id = $1`, [team_id]);

      return {
        message: 'Player signed',
        player_name: `${player.first_name} ${player.last_name}`,
        team_name: teamResult.rows[0].name,
        contract: {
          id: contractId,
          years,
          salary_per_year,
          total_value: salaries.reduce((a: number, b: number) => a + b, 0)
        }
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Sign player error:', error);
    res.status(500).json({ error: 'Failed to sign player' });
  }
});

// Release a player
router.post('/release', authMiddleware(true), async (req: any, res) => {
  try {
    const { team_id, player_id } = req.body;

    if (!team_id || !player_id) {
      return res.status(400).json({ error: 'team_id and player_id required' });
    }

    const result = await withTransaction(async (client) => {
      // Verify player is on team
      const playerResult = await client.query(
        `SELECT * FROM players WHERE id = $1 AND team_id = $2`,
        [player_id, team_id]
      );

      if (playerResult.rows.length === 0) {
        throw { status: 400, message: 'Player not on this team' };
      }

      const player = playerResult.rows[0];

      // Get season
      const seasonId = await getLatestSeasonId(client);

      // Update contract status
      await client.query(
        `UPDATE contracts SET status = 'waived', updated_at = NOW()
         WHERE player_id = $1 AND team_id = $2 AND status = 'active'`,
        [player_id, team_id]
      );

      // Make player a free agent
      await client.query(
        `UPDATE players SET team_id = NULL, salary = 0 WHERE id = $1`,
        [player_id]
      );

      // Calculate market value for FA listing
      const marketValue = calculateMarketValue(player.overall, player.age, player.years_pro, player.potential);
      const prefs = generateFAPreferences({
        greed: player.greed || 50,
        ego: player.ego || 50,
        loyalty: player.loyalty || 50,
        age: player.age,
        overall: player.overall
      });

      // Add to free agent pool
      await client.query(
        `INSERT INTO free_agents
         (player_id, season_id, fa_type, money_priority, winning_priority, role_priority,
          market_size_priority, asking_salary, market_value, status)
         VALUES ($1, $2, 'unrestricted', $3, $4, $5, $6, $7, $8, 'available')
         ON CONFLICT (player_id, season_id) DO UPDATE
         SET status = 'available', updated_at = NOW()`,
        [player_id, seasonId, prefs.money, prefs.winning, prefs.role, prefs.market,
         calculateAskingSalary(marketValue, player.greed || 50), marketValue]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (season_id, transaction_type, player_id, team_id, details)
         VALUES ($1, 'release', $2, $3, $4)`,
        [seasonId, player_id, team_id, JSON.stringify({ reason: 'released' })]
      );

      return {
        player_name: `${player.first_name} ${player.last_name}`
      };
    });

    res.json({
      message: 'Player released',
      player_name: result.player_name,
      now_free_agent: true
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Release player error:', error);
    res.status(500).json({ error: 'Failed to release player' });
  }
});

// Get pending offers for a team
router.get('/team/:teamId/offers', async (req, res) => {
  try {
    const { teamId } = req.params;

    const seasonId = await getLatestSeasonId();

    const result = await pool.query(
      `SELECT co.*, p.first_name, p.last_name, p.position, p.overall, p.age
       FROM contract_offers co
       JOIN players p ON co.player_id = p.id
       WHERE co.team_id = $1 AND co.season_id = $2 AND co.status = 'pending'
       ORDER BY co.offered_at DESC`,
      [teamId, seasonId]
    );

    res.json({ offers: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const { limit = 50, team_id } = req.query;

    const seasonId = await getLatestSeasonId();

    let query = `
      SELECT t.*, p.first_name, p.last_name, tm.name as team_name, tm.abbreviation
      FROM transactions t
      LEFT JOIN players p ON t.player_id = p.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      WHERE t.season_id = $1
    `;

    const params: any[] = [seasonId];

    if (team_id) {
      query += ` AND (t.team_id = $2 OR t.other_team_id = $2)`;
      params.push(team_id);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({ transactions: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Helper function to sign a free agent atomically
async function signFreeAgentAtomic(
  playerId: string,
  teamId: string,
  years: number,
  salaryPerYear: number,
  seasonId: string,
  offerId: string
): Promise<boolean> {
  try {
    return await withTransaction(async (client) => {
      // Atomically claim the player - prevents double-signing
      const claimResult = await client.query(
        `UPDATE players SET team_id = $1, salary = $2
         WHERE id = $3 AND team_id IS NULL
         RETURNING *`,
        [teamId, salaryPerYear, playerId]
      );

      if (claimResult.rows.length === 0) {
        return false; // Player already signed
      }

      // Generate contract salaries
      const salaries = generateYearlySalaries(salaryPerYear, years);
      const contractId = uuidv4();

      // Create contract
      await client.query(
        `INSERT INTO contracts
         (id, player_id, team_id, total_years, years_remaining, base_salary,
          year_1_salary, year_2_salary, year_3_salary, year_4_salary, year_5_salary,
          contract_type, status, start_season_id)
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, 'standard', 'active', $11)`,
        [contractId, playerId, teamId, years, salaryPerYear,
         salaries[0], salaries[1] || null, salaries[2] || null, salaries[3] || null, salaries[4] || null,
         seasonId]
      );

      // Update free agent status
      await client.query(
        `UPDATE free_agents SET status = 'signed', signed_at = NOW() WHERE player_id = $1 AND season_id = $2`,
        [playerId, seasonId]
      );

      // Update all offers for this player
      await client.query(
        `UPDATE contract_offers SET status = CASE WHEN id = $1 THEN 'accepted' ELSE 'rejected' END
         WHERE player_id = $2 AND status = 'pending'`,
        [offerId, playerId]
      );

      return true;
    });
  } catch (error) {
    console.error('Atomic signing failed:', error);
    return false;
  }
}

// Simulate CPU free agent decisions (advance offseason)
router.post('/simulate', async (req, res) => {
  try {
    const seasonId = await getLatestSeasonId();
    if (!seasonId) {
      return res.status(400).json({ error: 'No active season' });
    }

    // Get all pending offers
    const pendingOffers = await pool.query(
      `SELECT co.*, p.overall, p.age, p.potential,
              fa.asking_salary, fa.money_priority, fa.winning_priority, fa.role_priority, fa.market_size_priority
       FROM contract_offers co
       JOIN players p ON co.player_id = p.id
       LEFT JOIN free_agents fa ON co.player_id = fa.player_id
       WHERE co.status = 'pending' AND co.season_id = $1`,
      [seasonId]
    );

    const decisions: any[] = [];

    // Group offers by player
    const offersByPlayer = new Map<string, any[]>();
    for (const offer of pendingOffers.rows) {
      const existing = offersByPlayer.get(offer.player_id) || [];
      existing.push(offer);
      offersByPlayer.set(offer.player_id, existing);
    }

    // Evaluate each player's offers
    for (const [playerId, offers] of offersByPlayer) {
      const player = offers[0]; // All have same player info

      // Score each offer (simplified - use average score threshold)
      let bestOffer = null;
      let bestScore = 0;

      for (const offer of offers) {
        // Simple scoring: money weight * salary ratio + other factors
        const salaryRatio = offer.salary_per_year / (player.asking_salary || offer.salary_per_year);
        const score = salaryRatio * 50 + offer.years * 5 + Math.random() * 20;

        if (score > bestScore) {
          bestScore = score;
          bestOffer = offer;
        }
      }

      // Accept if score > 50
      if (bestOffer && bestScore > 50) {
        // Execute the signing atomically
        const signed = await signFreeAgentAtomic(
          playerId,
          bestOffer.team_id,
          bestOffer.years,
          bestOffer.salary_per_year,
          seasonId,
          bestOffer.id
        );

        if (signed) {
          decisions.push({
            player_id: playerId,
            decision: 'accepted',
            team_id: bestOffer.team_id,
            years: bestOffer.years,
            salary: bestOffer.salary_per_year
          });
        } else {
          decisions.push({
            player_id: playerId,
            decision: 'already_signed'
          });
        }
      } else {
        decisions.push({
          player_id: playerId,
          decision: 'no_acceptable_offer'
        });
      }
    }

    res.json({
      message: 'Free agency simulation complete',
      signings: decisions.filter(d => d.decision === 'accepted').length,
      decisions
    });
  } catch (error) {
    console.error('FA simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate free agency' });
  }
});

export default router;
