import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

// Get all traits
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM traits ORDER BY category, rarity, name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traits' });
  }
});

export default router;
