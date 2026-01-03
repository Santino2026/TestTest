// Free Agency API Routes
import { Router } from 'express';
import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
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

const router = Router();

// Get all free agents
router.get('/', async (req, res) => {
  try {
    const seasonResult = await pool.query(
      `SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`
    );
    const seasonId = seasonResult.rows[0]?.id;

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
      // Use current year salary
      const yearSalary = c[`year_${6 - c.years_remaining}_salary`] || c.base_salary;
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
router.post('/offer', async (req, res) => {
  try {
    const { team_id, player_id, years, salary_per_year, player_option, team_option, signing_bonus } = req.body;

    if (!team_id || !player_id || !years || !salary_per_year) {
      return res.status(400).json({ error: 'team_id, player_id, years, and salary_per_year required' });
    }

    // Get season
    const seasonResult = await pool.query(
      `SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`
    );
    const seasonId = seasonResult.rows[0]?.id;

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
router.post('/sign', async (req, res) => {
  try {
    const { team_id, player_id, years, salary_per_year } = req.body;

    if (!team_id || !player_id || !years || !salary_per_year) {
      return res.status(400).json({ error: 'team_id, player_id, years, and salary_per_year required' });
    }

    // Get season
    const seasonResult = await pool.query(
      `SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`
    );
    const seasonId = seasonResult.rows[0]?.id;

    // Verify player is free agent
    const playerResult = await pool.query(
      `SELECT * FROM players WHERE id = $1 AND team_id IS NULL`,
      [player_id]
    );

    if (playerResult.rows.length === 0) {
      return res.status(400).json({ error: 'Player is not a free agent' });
    }

    const player = playerResult.rows[0];

    // Verify team roster space
    const rosterResult = await pool.query(
      `SELECT COUNT(*) FROM players WHERE team_id = $1`,
      [team_id]
    );

    if (parseInt(rosterResult.rows[0].count) >= 15) {
      return res.status(400).json({ error: 'Roster is full (15 players max)' });
    }

    // Generate contract salaries
    const salaries = generateYearlySalaries(salary_per_year, years);

    // Create contract
    const contractId = uuidv4();
    await pool.query(
      `INSERT INTO contracts
       (id, player_id, team_id, total_years, years_remaining, base_salary,
        year_1_salary, year_2_salary, year_3_salary, year_4_salary, year_5_salary,
        contract_type, status, start_season_id)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, 'standard', 'active', $11)`,
      [contractId, player_id, team_id, years, salary_per_year,
       salaries[0], salaries[1] || null, salaries[2] || null, salaries[3] || null, salaries[4] || null,
       seasonId]
    );

    // Update player
    await pool.query(
      `UPDATE players SET team_id = $1, salary = $2 WHERE id = $3`,
      [team_id, salary_per_year, player_id]
    );

    // Update free agent record
    await pool.query(
      `UPDATE free_agents SET status = 'signed', signed_at = NOW() WHERE player_id = $1 AND season_id = $2`,
      [player_id, seasonId]
    );

    // Log transaction
    await pool.query(
      `INSERT INTO transactions (season_id, transaction_type, player_id, team_id, contract_id, details)
       VALUES ($1, 'signing', $2, $3, $4, $5)`,
      [seasonId, player_id, team_id, contractId, JSON.stringify({ years, salary: salary_per_year })]
    );

    // Get team name for response
    const teamResult = await pool.query(`SELECT name FROM teams WHERE id = $1`, [team_id]);

    res.json({
      message: 'Player signed',
      player_name: `${player.first_name} ${player.last_name}`,
      team_name: teamResult.rows[0].name,
      contract: {
        id: contractId,
        years,
        salary_per_year,
        total_value: salaries.reduce((a, b) => a + b, 0)
      }
    });
  } catch (error) {
    console.error('Sign player error:', error);
    res.status(500).json({ error: 'Failed to sign player' });
  }
});

// Release a player
router.post('/release', async (req, res) => {
  try {
    const { team_id, player_id } = req.body;

    if (!team_id || !player_id) {
      return res.status(400).json({ error: 'team_id and player_id required' });
    }

    // Verify player is on team
    const playerResult = await pool.query(
      `SELECT * FROM players WHERE id = $1 AND team_id = $2`,
      [player_id, team_id]
    );

    if (playerResult.rows.length === 0) {
      return res.status(400).json({ error: 'Player not on this team' });
    }

    const player = playerResult.rows[0];

    // Get season
    const seasonResult = await pool.query(
      `SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`
    );
    const seasonId = seasonResult.rows[0]?.id;

    // Update contract status
    await pool.query(
      `UPDATE contracts SET status = 'waived', updated_at = NOW()
       WHERE player_id = $1 AND team_id = $2 AND status = 'active'`,
      [player_id, team_id]
    );

    // Make player a free agent
    await pool.query(
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
    await pool.query(
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
    await pool.query(
      `INSERT INTO transactions (season_id, transaction_type, player_id, team_id, details)
       VALUES ($1, 'release', $2, $3, $4)`,
      [seasonId, player_id, team_id, JSON.stringify({ reason: 'released' })]
    );

    res.json({
      message: 'Player released',
      player_name: `${player.first_name} ${player.last_name}`,
      now_free_agent: true
    });
  } catch (error) {
    console.error('Release player error:', error);
    res.status(500).json({ error: 'Failed to release player' });
  }
});

// Get pending offers for a team
router.get('/team/:teamId/offers', async (req, res) => {
  try {
    const { teamId } = req.params;

    const seasonResult = await pool.query(
      `SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`
    );
    const seasonId = seasonResult.rows[0]?.id;

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

    const seasonResult = await pool.query(
      `SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`
    );
    const seasonId = seasonResult.rows[0]?.id;

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

// Simulate CPU free agent decisions (advance offseason)
router.post('/simulate', async (req, res) => {
  try {
    const seasonResult = await pool.query(
      `SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`
    );
    const seasonId = seasonResult.rows[0]?.id;

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
        // Accept offer - would need to call sign logic here
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
          decision: 'no_acceptable_offer'
        });
      }
    }

    res.json({
      message: 'Free agency simulation complete',
      decisions
    });
  } catch (error) {
    console.error('FA simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate free agency' });
  }
});

export default router;
