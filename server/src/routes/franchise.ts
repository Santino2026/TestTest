import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';

const router = Router();

// Helper to get franchise with team info
async function getFranchiseWithDetails(franchiseId: string) {
  const result = await pool.query(
    `SELECT f.*, t.name as team_name, t.abbreviation, t.city,
            t.primary_color, t.secondary_color, t.conference, t.division,
            s.wins, s.losses
     FROM franchises f
     JOIN teams t ON f.team_id = t.id
     LEFT JOIN standings s ON f.team_id = s.team_id AND f.season_id = s.season_id
     WHERE f.id = $1`,
    [franchiseId]
  );
  return result.rows[0] || null;
}

// Get current user's ACTIVE franchise (or null if none)
router.get('/', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT f.*, t.name as team_name, t.abbreviation, t.city,
              t.primary_color, t.secondary_color, t.conference, t.division,
              s.wins, s.losses
       FROM franchises f
       JOIN teams t ON f.team_id = t.id
       LEFT JOIN standings s ON f.team_id = s.team_id AND f.season_id = s.season_id
       WHERE f.user_id = $1 AND f.is_active = TRUE`,
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchise' });
  }
});

// Get ALL franchises for current user
router.get('/list', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT f.*, t.name as team_name, t.abbreviation, t.city,
              t.primary_color, t.secondary_color, t.conference, t.division,
              s.wins, s.losses
       FROM franchises f
       JOIN teams t ON f.team_id = t.id
       LEFT JOIN standings s ON f.team_id = s.team_id AND f.season_id = s.season_id
       WHERE f.user_id = $1
       ORDER BY f.last_played_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchises' });
  }
});

// Create a NEW franchise (does NOT overwrite existing ones)
router.post('/create', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { team_id, name } = req.body;

    if (!team_id) {
      return res.status(400).json({ error: 'team_id is required' });
    }

    // Verify team exists
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [team_id]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const team = teamResult.rows[0];

    // Check if user already has a franchise with this team
    const existingResult = await pool.query(
      'SELECT id FROM franchises WHERE user_id = $1 AND team_id = $2',
      [userId, team_id]
    );
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a franchise with this team' });
    }

    // Deactivate all other franchises for this user
    await pool.query(
      'UPDATE franchises SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );

    // Create new season for this franchise
    const newSeason = await pool.query(
      `INSERT INTO seasons (season_number, status) VALUES (1, 'preseason') RETURNING id`
    );
    const seasonId = newSeason.rows[0].id;

    // Create the franchise
    const franchiseName = name || `${team.city} ${team.name}`;
    const insertResult = await pool.query(
      `INSERT INTO franchises (user_id, team_id, season_id, phase, current_day, name, is_active)
       VALUES ($1, $2, $3, 'preseason', 1, $4, TRUE)
       RETURNING *`,
      [userId, team_id, seasonId, franchiseName]
    );

    // Return full franchise details
    const franchise = await getFranchiseWithDetails(insertResult.rows[0].id);
    res.json(franchise);
  } catch (error) {
    console.error('Franchise create error:', error);
    res.status(500).json({ error: 'Failed to create franchise' });
  }
});

// Legacy endpoint - now creates new franchise instead of overwriting
router.post('/select', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { team_id } = req.body;

    if (!team_id) {
      return res.status(400).json({ error: 'team_id is required' });
    }

    // Check if user already has a franchise with this team
    const existingResult = await pool.query(
      'SELECT id FROM franchises WHERE user_id = $1 AND team_id = $2',
      [userId, team_id]
    );

    if (existingResult.rows.length > 0) {
      // Switch to existing franchise
      await pool.query('UPDATE franchises SET is_active = FALSE WHERE user_id = $1', [userId]);
      await pool.query(
        'UPDATE franchises SET is_active = TRUE, last_played_at = NOW() WHERE id = $1',
        [existingResult.rows[0].id]
      );
      const franchise = await getFranchiseWithDetails(existingResult.rows[0].id);
      return res.json(franchise);
    }

    // Create new franchise
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [team_id]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const team = teamResult.rows[0];

    // Deactivate other franchises
    await pool.query('UPDATE franchises SET is_active = FALSE WHERE user_id = $1', [userId]);

    // Create new season
    const newSeason = await pool.query(
      `INSERT INTO seasons (season_number, status) VALUES (1, 'preseason') RETURNING id`
    );
    const seasonId = newSeason.rows[0].id;

    // Create franchise
    const insertResult = await pool.query(
      `INSERT INTO franchises (user_id, team_id, season_id, phase, current_day, name, is_active)
       VALUES ($1, $2, $3, 'preseason', 1, $4, TRUE)
       RETURNING *`,
      [userId, team_id, seasonId, `${team.city} ${team.name}`]
    );

    const franchise = await getFranchiseWithDetails(insertResult.rows[0].id);
    res.json(franchise);
  } catch (error) {
    console.error('Franchise select error:', error);
    res.status(500).json({ error: 'Failed to select franchise' });
  }
});

// Switch to a different franchise
router.post('/:id/switch', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const franchiseId = req.params.id;

    // Verify franchise belongs to user
    const verifyResult = await pool.query(
      'SELECT id FROM franchises WHERE id = $1 AND user_id = $2',
      [franchiseId, userId]
    );
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

    // Deactivate all, then activate the selected one
    await pool.query('UPDATE franchises SET is_active = FALSE WHERE user_id = $1', [userId]);
    await pool.query(
      'UPDATE franchises SET is_active = TRUE, last_played_at = NOW() WHERE id = $1',
      [franchiseId]
    );

    const franchise = await getFranchiseWithDetails(franchiseId);
    res.json(franchise);
  } catch (error) {
    console.error('Franchise switch error:', error);
    res.status(500).json({ error: 'Failed to switch franchise' });
  }
});

// Update franchise settings (name, difficulty, etc.)
router.patch('/:id', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const franchiseId = req.params.id;
    const { name, difficulty, auto_save, sim_speed } = req.body;

    // Verify franchise belongs to user
    const verifyResult = await pool.query(
      'SELECT id FROM franchises WHERE id = $1 AND user_id = $2',
      [franchiseId, userId]
    );
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (difficulty !== undefined) {
      updates.push(`difficulty = $${paramCount++}`);
      values.push(difficulty);
    }
    if (auto_save !== undefined) {
      updates.push(`auto_save = $${paramCount++}`);
      values.push(auto_save);
    }
    if (sim_speed !== undefined) {
      updates.push(`sim_speed = $${paramCount++}`);
      values.push(sim_speed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(franchiseId);
    await pool.query(
      `UPDATE franchises SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    const franchise = await getFranchiseWithDetails(franchiseId);
    res.json(franchise);
  } catch (error) {
    console.error('Franchise update error:', error);
    res.status(500).json({ error: 'Failed to update franchise' });
  }
});

// Delete a franchise
router.delete('/:id', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const franchiseId = req.params.id;

    // Verify franchise belongs to user
    const verifyResult = await pool.query(
      'SELECT id, is_active FROM franchises WHERE id = $1 AND user_id = $2',
      [franchiseId, userId]
    );
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

    const wasActive = verifyResult.rows[0].is_active;

    // Delete the franchise
    await pool.query('DELETE FROM franchises WHERE id = $1', [franchiseId]);

    // If this was the active franchise, activate the most recent one
    if (wasActive) {
      await pool.query(
        `UPDATE franchises SET is_active = TRUE
         WHERE id = (
           SELECT id FROM franchises WHERE user_id = $1 ORDER BY last_played_at DESC LIMIT 1
         )`,
        [userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Franchise delete error:', error);
    res.status(500).json({ error: 'Failed to delete franchise' });
  }
});

export default router;
