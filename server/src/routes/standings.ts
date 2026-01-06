import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

// Get standings
router.get('/', async (req, res) => {
  try {
    const seasonId = req.query.season_id as string;

    let query = `
      SELECT s.*, t.name, t.city, t.abbreviation, t.conference, t.division,
             t.primary_color, t.secondary_color
      FROM standings s
      JOIN teams t ON s.team_id = t.id
      JOIN seasons sea ON s.season_id = sea.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (seasonId) {
      params.push(seasonId);
      query += ` AND s.season_id = $${params.length}`;
    } else {
      // Default: only non-completed seasons
      query += ` AND sea.status != 'completed'`;
    }

    query += ` ORDER BY t.conference, t.division, (s.wins::float / NULLIF(s.wins + s.losses, 0)) DESC NULLS LAST`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

export default router;
