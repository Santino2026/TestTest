import { Router } from 'express';
import { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../auth';
import {
  calculateMarketValue,
  generateYearlySalaries,
  calculateLuxuryTax,
  SALARY_CAP,
  generateFAPreferences,
  calculateAskingSalary,
  validateOffer,
} from '../freeagency';
import { withTransaction, withAdvisoryLock, lockPlayer } from '../db/transactions';
import { getUserActiveFranchise, getLatestSeasonId } from '../db/queries';

const router = Router();

function isFreeAgencyAllowed(franchise: any): { allowed: boolean; reason?: string } {
  if (!franchise) {
    return { allowed: false, reason: 'No active franchise' };
  }

  // Allow signing during regular season, preseason, and offseason (free_agency/training_camp phases)
  const allowedPhases = ['regular_season', 'preseason'];
  const allowedOffseasonPhases = ['free_agency', 'training_camp'];

  if (allowedPhases.includes(franchise.phase)) {
    return { allowed: true };
  }

  if (franchise.phase === 'offseason' && allowedOffseasonPhases.includes(franchise.offseason_phase)) {
    return { allowed: true };
  }

  const phaseInfo = franchise.offseason_phase ? ` (${franchise.offseason_phase})` : '';
  return { allowed: false, reason: `Free agency is not available in ${franchise.phase} phase${phaseInfo}` };
}

async function createContract(
  client: PoolClient,
  playerId: string,
  teamId: string,
  years: number,
  salaryPerYear: number,
  seasonId: string
): Promise<{ contractId: string; salaries: number[] }> {
  const salaries = generateYearlySalaries(salaryPerYear, years);
  const contractId = uuidv4();

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

  return { contractId, salaries };
}

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

    // Calculate asking_salary on the fly if not set
    const freeAgents = result.rows.map(player => {
      if (!player.asking_salary) {
        const marketValue = calculateMarketValue(player.overall, player.age, player.years_pro || 0, player.potential);
        player.market_value = marketValue;
        // Asking salary is 90-120% of market value (some randomness)
        player.asking_salary = Math.round(marketValue * (0.9 + Math.random() * 0.3));
      }
      return player;
    });

    res.json(freeAgents);
  } catch (error) {
    console.error('Free agents error:', error);
    res.status(500).json({ error: 'Failed to fetch free agents' });
  }
});

router.get('/team/:teamId/salary', async (req, res) => {
  try {
    const { teamId } = req.params;

    const contractsResult = await pool.query(
      `SELECT c.*, p.first_name, p.last_name, p.position, p.overall
       FROM contracts c
       JOIN players p ON c.player_id = p.id
       WHERE c.team_id = $1 AND c.status = 'active'
       ORDER BY c.base_salary DESC`,
      [teamId]
    );

    const payroll = contractsResult.rows.reduce((sum, c) => {
      const currentYear = c.total_years - c.years_remaining + 1;
      const yearSalary = c[`year_${currentYear}_salary`] || c.base_salary;
      return sum + parseInt(yearSalary);
    }, 0);

    const capSpace = Math.max(0, SALARY_CAP.cap - payroll);

    res.json({
      team_id: teamId,
      contracts: contractsResult.rows,
      payroll,
      salary_cap: SALARY_CAP.cap,
      cap_space: capSpace,
      luxury_tax_threshold: SALARY_CAP.luxury_tax,
      luxury_tax_owed: calculateLuxuryTax(payroll),
      over_cap: payroll > SALARY_CAP.cap,
      in_tax: payroll > SALARY_CAP.luxury_tax
    });
  } catch (error) {
    console.error('Team salary error:', error);
    res.status(500).json({ error: 'Failed to fetch team salary' });
  }
});

router.post('/offer', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    const phaseCheck = isFreeAgencyAllowed(franchise);
    if (!phaseCheck.allowed) {
      return res.status(400).json({ error: phaseCheck.reason });
    }

    const { team_id, player_id, years, salary_per_year, player_option, team_option, signing_bonus } = req.body;
    if (!team_id || !player_id || !years || !salary_per_year) {
      return res.status(400).json({ error: 'team_id, player_id, years, and salary_per_year required' });
    }

    const seasonId = await getLatestSeasonId();

    const playerResult = await pool.query(
      `SELECT p.*, fa.asking_salary, fa.market_value
       FROM players p
       LEFT JOIN free_agents fa ON p.id = fa.player_id
       WHERE p.id = $1 AND p.team_id IS NULL`,
      [player_id]
    );
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Free agent not found' });
    }
    const player = playerResult.rows[0];

    const teamResult = await pool.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM players WHERE team_id = t.id) as roster_size,
              (SELECT COALESCE(SUM(c.base_salary), 0) FROM contracts c WHERE c.team_id = t.id AND c.status = 'active') as payroll
       FROM teams t WHERE t.id = $1`,
      [team_id]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const team = teamResult.rows[0];

    const marketValue = player.market_value || calculateMarketValue(player.overall, player.age, player.years_pro, player.potential);
    const validation = validateOffer(
      { payroll: parseInt(team.payroll), roster_size: parseInt(team.roster_size) },
      { team_id, player_id, years, salary_per_year, total_value: salary_per_year * years },
      { market_value: marketValue } as any
    );

    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', '), warnings: validation.warnings });
    }

    const offerId = uuidv4();
    await pool.query(
      `INSERT INTO contract_offers
       (id, player_id, team_id, season_id, years, salary_per_year, total_value,
        player_option, team_option, signing_bonus, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW() + INTERVAL '7 days')
       ON CONFLICT (id) DO NOTHING`,
      [offerId, player_id, team_id, seasonId, years, salary_per_year, salary_per_year * years,
       player_option || false, team_option || false, signing_bonus || 0]
    );

    res.json({ message: 'Offer submitted', offer_id: offerId, warnings: validation.warnings });
  } catch (error) {
    console.error('Make offer error:', error);
    res.status(500).json({ error: 'Failed to make offer' });
  }
});

router.post('/sign', authMiddleware(true), async (req: any, res) => {
  console.log('Sign request body:', req.body);
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    const phaseCheck = isFreeAgencyAllowed(franchise);
    if (!phaseCheck.allowed) {
      return res.status(400).json({ error: phaseCheck.reason });
    }

    const { player_id, years: rawYears, salary } = req.body;
    const team_id = franchise?.team_id;
    const years = rawYears !== undefined && rawYears !== null ? Number(rawYears) : 1;
    
    console.log('Sign request - player_id:', player_id, 'rawYears:', rawYears, 'years:', years, 'salary:', salary);
    
    // Validate required fields
    if (!player_id) {
      return res.status(400).json({ error: 'player_id is required' });
    }
    if (salary === undefined || salary === null) {
      return res.status(400).json({ error: 'salary is required' });
    }
    if (!team_id) {
      return res.status(400).json({ error: 'No active franchise found' });
    }
    
    const salaryAmount = Number(salary);

    // Lock on both player and team to prevent race conditions
    const result = await withAdvisoryLock(`sign-team-${team_id}`, async (client) => {
      const seasonId = await getLatestSeasonId(client);
      if (!seasonId) {
        throw { status: 500, message: 'No active season found' };
      }

      const player = await lockPlayer(client, player_id);
      if (!player) {
        throw { status: 404, message: 'Player not found' };
      }
      if (player.team_id !== null) {
        throw { status: 400, message: 'Player is not a free agent or was already signed' };
      }

      // Use FOR UPDATE to lock the roster count during this transaction
      const rosterResult = await client.query(
        `SELECT COUNT(*) FROM players WHERE team_id = $1`,
        [team_id]
      );
      if (parseInt(rosterResult.rows[0].count) >= 15) {
        throw { status: 400, message: 'Roster is full (15 players max)' };
      }

      await client.query(`UPDATE players SET team_id = $1, salary = $2 WHERE id = $3`, [team_id, salaryAmount, player_id]);

      const { contractId, salaries } = await createContract(client, player_id, team_id, years, salaryAmount, seasonId);

      await client.query(
        `UPDATE free_agents SET status = 'signed', signed_at = NOW() WHERE player_id = $1 AND season_id = $2`,
        [player_id, seasonId]
      );

      await client.query(
        `INSERT INTO transactions (season_id, transaction_type, player_id, team_id, contract_id, details)
         VALUES ($1, 'signing', $2, $3, $4, $5)`,
        [seasonId, player_id, team_id, contractId, JSON.stringify({ years, salary: salaryAmount })]
      );

      const teamResult = await client.query(`SELECT name FROM teams WHERE id = $1`, [team_id]);

      return {
        message: 'Player signed',
        player_name: `${player.first_name} ${player.last_name}`,
        team_name: teamResult.rows[0].name,
        contract: { id: contractId, years, salaryAmount, total_value: salaries.reduce((a, b) => a + b, 0) }
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

router.post('/release', authMiddleware(true), async (req: any, res) => {
  try {
    const { team_id, player_id } = req.body;
    if (!team_id || !player_id) {
      return res.status(400).json({ error: 'team_id and player_id required' });
    }

    const result = await withTransaction(async (client) => {
      const playerResult = await client.query(
        `SELECT * FROM players WHERE id = $1 AND team_id = $2`,
        [player_id, team_id]
      );
      if (playerResult.rows.length === 0) {
        throw { status: 400, message: 'Player not on this team' };
      }
      const player = playerResult.rows[0];
      const seasonId = await getLatestSeasonId(client);

      await client.query(
        `UPDATE contracts SET status = 'waived', updated_at = NOW()
         WHERE player_id = $1 AND team_id = $2 AND status = 'active'`,
        [player_id, team_id]
      );

      await client.query(`UPDATE players SET team_id = NULL, salary = 0 WHERE id = $1`, [player_id]);

      const marketValue = calculateMarketValue(player.overall, player.age, player.years_pro, player.potential);
      const prefs = generateFAPreferences({
        greed: player.greed || 50,
        ego: player.ego || 50,
        loyalty: player.loyalty || 50,
        age: player.age,
        overall: player.overall
      });

      await client.query(
        `INSERT INTO free_agents
         (player_id, season_id, fa_type, money_priority, winning_priority, role_priority,
          market_size_priority, asking_salary, market_value, status)
         VALUES ($1, $2, 'unrestricted', $3, $4, $5, $6, $7, $8, 'available')
         ON CONFLICT (player_id, season_id) DO UPDATE SET status = 'available', updated_at = NOW()`,
        [player_id, seasonId, prefs.money, prefs.winning, prefs.role, prefs.market,
         calculateAskingSalary(marketValue, player.greed || 50), marketValue]
      );

      await client.query(
        `INSERT INTO transactions (season_id, transaction_type, player_id, team_id, details)
         VALUES ($1, 'release', $2, $3, $4)`,
        [seasonId, player_id, team_id, JSON.stringify({ reason: 'released' })]
      );

      return { player_name: `${player.first_name} ${player.last_name}` };
    });

    res.json({ message: 'Player released', player_name: result.player_name, now_free_agent: true });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Release player error:', error);
    res.status(500).json({ error: 'Failed to release player' });
  }
});

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

router.get('/transactions', async (req, res) => {
  try {
    const { limit = 50, team_id } = req.query;
    const seasonId = await getLatestSeasonId();
    const params: any[] = [seasonId];

    let query = `
      SELECT t.*, p.first_name, p.last_name, tm.name as team_name, tm.abbreviation
      FROM transactions t
      LEFT JOIN players p ON t.player_id = p.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      WHERE t.season_id = $1`;

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

async function signFreeAgentAtomic(
  playerId: string,
  teamId: string,
  years: number,
  salaryPerYear: number,
  seasonId: string,
  offerId: string
): Promise<boolean> {
  try {
    return await withAdvisoryLock(`sign-player-${playerId}`, async (client) => {
      const player = await lockPlayer(client, playerId);
      if (!player || player.team_id !== null) {
        return false;
      }

      await client.query(`UPDATE players SET team_id = $1, salary = $2 WHERE id = $3`, [teamId, salaryPerYear, playerId]);
      await createContract(client, playerId, teamId, years, salaryPerYear, seasonId);

      await client.query(
        `UPDATE free_agents SET status = 'signed', signed_at = NOW() WHERE player_id = $1 AND season_id = $2`,
        [playerId, seasonId]
      );

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

router.post('/simulate', authMiddleware(true), async (req: any, res) => {
  try {
    const seasonId = await getLatestSeasonId();
    if (!seasonId) {
      return res.status(400).json({ error: 'No active season' });
    }

    const pendingOffers = await pool.query(
      `SELECT co.*, p.overall, p.age, p.potential, fa.asking_salary
       FROM contract_offers co
       JOIN players p ON co.player_id = p.id
       LEFT JOIN free_agents fa ON co.player_id = fa.player_id
       WHERE co.status = 'pending' AND co.season_id = $1`,
      [seasonId]
    );

    const offersByPlayer = new Map<string, any[]>();
    for (const offer of pendingOffers.rows) {
      const existing = offersByPlayer.get(offer.player_id) || [];
      existing.push(offer);
      offersByPlayer.set(offer.player_id, existing);
    }

    const decisions: any[] = [];

    for (const [playerId, offers] of offersByPlayer) {
      const player = offers[0];

      let bestOffer = null;
      let bestScore = 0;

      for (const offer of offers) {
        const salaryRatio = offer.salary_per_year / (player.asking_salary || offer.salary_per_year);
        const score = salaryRatio * 50 + offer.years * 5 + Math.random() * 20;
        if (score > bestScore) {
          bestScore = score;
          bestOffer = offer;
        }
      }

      if (bestOffer && bestScore > 50) {
        const signed = await signFreeAgentAtomic(
          playerId, bestOffer.team_id, bestOffer.years, bestOffer.salary_per_year, seasonId, bestOffer.id
        );

        decisions.push(signed
          ? { player_id: playerId, decision: 'accepted', team_id: bestOffer.team_id, years: bestOffer.years, salary: bestOffer.salary_per_year }
          : { player_id: playerId, decision: 'already_signed' }
        );
      } else {
        decisions.push({ player_id: playerId, decision: 'no_acceptable_offer' });
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
