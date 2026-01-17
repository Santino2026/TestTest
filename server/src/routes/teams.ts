import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY conference, division, name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [teamResult, playersResult] = await Promise.all([
      pool.query('SELECT * FROM teams WHERE id = $1', [id]),
      pool.query(
        `SELECT p.*, pa.*
         FROM players p
         LEFT JOIN player_attributes pa ON p.id = pa.player_id
         WHERE p.team_id = $1
         ORDER BY p.overall DESC`,
        [id]
      )
    ]);

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ ...teamResult.rows[0], roster: playersResult.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

export default router;
