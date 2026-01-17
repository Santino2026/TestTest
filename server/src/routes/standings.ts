import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const seasonId = req.query.season_id as string;
    const params: any[] = [];

    let seasonFilter = `AND sea.status != 'completed'`;
    if (seasonId) {
      params.push(seasonId);
      seasonFilter = `AND s.season_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT s.*, t.name, t.city, t.abbreviation, t.conference, t.division,
              t.primary_color, t.secondary_color
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       JOIN seasons sea ON s.season_id = sea.id
       WHERE 1=1 ${seasonFilter}
       ORDER BY t.conference, t.division, (s.wins::float / NULLIF(s.wins + s.losses, 0)) DESC NULLS LAST`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

export default router;
