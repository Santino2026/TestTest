import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    const position = req.query.position as string;
    const freeAgents = req.query.freeAgents === 'true';

    let query = `
      SELECT p.id, p.first_name, p.last_name, p.team_id, p.position, p.archetype,
             p.height_inches, p.weight_lbs, p.age, p.jersey_number, p.years_pro,
             p.overall, p.potential, t.name as team_name, t.abbreviation as team_abbrev
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (position) {
      params.push(position);
      query += ` AND p.position = $${params.length}`;
    }
    if (freeAgents) {
      query += ` AND p.team_id IS NULL`;
    }

    query += ` ORDER BY p.overall DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query('SELECT COUNT(*) FROM players')
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      players: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [playerResult, traitsResult] = await Promise.all([
      pool.query(
        `SELECT p.*, pa.*, t.name as team_name, t.abbreviation as team_abbrev
         FROM players p
         LEFT JOIN player_attributes pa ON p.id = pa.player_id
         LEFT JOIN teams t ON p.team_id = t.id
         WHERE p.id = $1`,
        [id]
      ),
      pool.query(
        `SELECT t.*, pt.tier
         FROM player_traits pt
         JOIN traits t ON pt.trait_id = t.id
         WHERE pt.player_id = $1`,
        [id]
      )
    ]);

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ ...playerResult.rows[0], traits: traitsResult.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

function calculateDevelopmentPhase(age: number, peakAge: number, overall: number, potential: number): { phase: string; projection: string } {
  if (age < peakAge) {
    const yearsToGo = peakAge - age;
    const potentialGap = potential - overall;
    return {
      phase: 'development',
      projection: `+${Math.round(potentialGap / yearsToGo)} OVR/yr until peak at age ${peakAge}`
    };
  }

  if (age <= peakAge + 3) {
    return { phase: 'peak', projection: `In prime years (peak age ${peakAge})` };
  }

  const yearsPastPeak = age - (peakAge + 3);
  return { phase: 'decline', projection: `Declining (${yearsPastPeak} years past prime)` };
}

router.get('/team/:teamId/development', authMiddleware(true), async (req: any, res) => {
  try {
    const { teamId } = req.params;

    const result = await pool.query(
      `SELECT
        p.id, p.first_name, p.last_name, p.position, p.archetype,
        p.age, p.overall, p.potential, p.years_pro,
        p.peak_age, p.work_ethic, p.coachability, p.durability,
        pa.speed, pa.acceleration, pa.vertical, pa.stamina, pa.strength,
        pa.three_point, pa.mid_range, pa.inside_scoring, pa.ball_handling,
        pa.perimeter_defense, pa.interior_defense, pa.basketball_iq
       FROM players p
       LEFT JOIN player_attributes pa ON p.id = pa.player_id
       WHERE p.team_id = $1
       ORDER BY p.overall DESC`,
      [teamId]
    );

    const playersWithDev = result.rows.map(player => {
      const peakAge = player.peak_age || 28;
      const { phase, projection } = calculateDevelopmentPhase(player.age, peakAge, player.overall, player.potential);

      return {
        ...player,
        phase,
        peak_age: peakAge,
        years_to_peak: Math.max(0, peakAge - player.age),
        projection
      };
    });

    res.json(playersWithDev);
  } catch (error) {
    console.error('Failed to fetch development info:', error);
    res.status(500).json({ error: 'Failed to fetch development info' });
  }
});

export default router;
