import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';
import { generateSchedule, generatePreseasonSchedule } from '../schedule/generator';
import { getFranchiseWithDetails, verifyFranchiseOwnership } from '../db/queries';
import { withTransaction } from '../db/transactions';

const router = Router();

interface Team {
  id: string;
  name: string;
  city: string;
  conference: string;
  division: string;
}

// Helper to create a new franchise with season, standings, and schedule
async function createNewFranchise(
  userId: string,
  team: Team,
  franchiseName: string
): Promise<any> {
  // Create new season for this franchise
  const newSeason = await pool.query(
    `INSERT INTO seasons (season_number, status) VALUES (1, 'preseason') RETURNING id`
  );
  const seasonId = newSeason.rows[0].id;

  // Get all teams for schedule and standings
  const teamsResult = await pool.query(
    'SELECT id, conference, division FROM teams'
  );
  const teams = teamsResult.rows;

  // Initialize standings for all 30 teams for this season
  for (const t of teams) {
    await pool.query(
      `INSERT INTO standings (season_id, team_id, wins, losses, home_wins, home_losses,
       away_wins, away_losses, conference_wins, conference_losses, division_wins, division_losses,
       points_for, points_against, streak, last_10_wins)
       VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
       ON CONFLICT (season_id, team_id) DO NOTHING`,
      [seasonId, t.id]
    );
  }

  // Generate 8 preseason games (days -7 to 0)
  const preseasonSchedule = generatePreseasonSchedule(teams);

  // Auto-generate 82-game regular season schedule
  const schedule = generateSchedule(teams);

  // Batch insert all games for performance (preseason + regular season)
  const allGames = [
    ...preseasonSchedule.map(g => ({ ...g, is_preseason: true })),
    ...schedule.map(g => ({ ...g, is_preseason: false }))
  ];

  // Insert in batches of 100 for performance
  const batchSize = 100;
  for (let i = 0; i < allGames.length; i += batchSize) {
    const batch = allGames.slice(i, i + batchSize);
    const values: any[] = [];
    const placeholders: string[] = [];

    batch.forEach((game, idx) => {
      const isUserGame = game.home_team_id === team.id || game.away_team_id === team.id;
      const offset = idx * 7;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      values.push(seasonId, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame, game.is_preseason);
    });

    await pool.query(
      `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  // Create the franchise - start in preseason phase (day -7)
  const insertResult = await pool.query(
    `INSERT INTO franchises (user_id, team_id, season_id, phase, current_day, name, is_active)
     VALUES ($1, $2, $3, 'preseason', -7, $4, TRUE)
     RETURNING *`,
    [userId, team.id, seasonId, franchiseName]
  );

  // Season status stays 'preseason' until user advances
  await pool.query(
    `UPDATE seasons SET status = 'preseason' WHERE id = $1`,
    [seasonId]
  );

  return insertResult.rows[0];
}

// Get current user's ACTIVE franchise (or null if none)
router.get('/', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT f.*, t.name as team_name, t.abbreviation, t.city,
              t.primary_color, t.secondary_color, t.conference, t.division,
              s.wins, s.losses,
              COALESCE(f.preseason_wins, 0) as preseason_wins,
              COALESCE(f.preseason_losses, 0) as preseason_losses
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
              s.wins, s.losses,
              COALESCE(f.preseason_wins, 0) as preseason_wins,
              COALESCE(f.preseason_losses, 0) as preseason_losses
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

    // Check if user already has any franchise (unique constraint on user_id)
    const existingResult = await pool.query(
      'SELECT id, team_id FROM franchises WHERE user_id = $1',
      [userId]
    );
    if (existingResult.rows.length > 0) {
      // User already has a franchise - return it instead of error
      const franchise = await getFranchiseWithDetails(existingResult.rows[0].id);
      return res.json({ existing: true, franchise });
    }

    // No existing franchise - create new one
    await pool.query(
      'UPDATE franchises SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );

    // Create franchise using helper
    const franchiseName = name || `${team.city} ${team.name}`;
    const newFranchise = await createNewFranchise(userId, team, franchiseName);

    // Return full franchise details
    const franchise = await getFranchiseWithDetails(newFranchise.id);
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

    // Check if user already has any franchise
    const existingResult = await pool.query(
      'SELECT id, team_id FROM franchises WHERE user_id = $1',
      [userId]
    );

    if (existingResult.rows.length > 0) {
      // User already has a franchise - return it
      const franchise = await getFranchiseWithDetails(existingResult.rows[0].id);
      return res.json({ existing: true, franchise });
    }

    // Create new franchise
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [team_id]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const team = teamResult.rows[0];

    // Create franchise using helper
    const franchiseName = `${team.city} ${team.name}`;
    const newFranchise = await createNewFranchise(userId, team, franchiseName);

    const franchise = await getFranchiseWithDetails(newFranchise.id);
    res.json(franchise);
  } catch (error: any) {
    console.error('Franchise select error:', error);
    const errorMessage = error?.message || 'Failed to select franchise';
    const errorCode = error?.code;

    // Check for specific database errors
    if (errorCode === '23505') { // unique_violation
      res.status(400).json({ error: 'Franchise data already exists. Try refreshing the page.' });
    } else if (errorCode === '23503') { // foreign_key_violation
      res.status(400).json({ error: 'Invalid team or season data. Please try again.' });
    } else {
      res.status(500).json({ error: `Failed to select franchise: ${errorMessage}` });
    }
  }
});

// Switch to a different franchise
router.post('/:id/switch', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const franchiseId = req.params.id;

    // Verify franchise belongs to user
    const isOwner = await verifyFranchiseOwnership(franchiseId, userId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

    // Deactivate all, then activate the selected one - atomic operation
    const franchise = await withTransaction(async (client) => {
      await client.query('UPDATE franchises SET is_active = FALSE WHERE user_id = $1', [userId]);
      await client.query(
        'UPDATE franchises SET is_active = TRUE, last_played_at = NOW() WHERE id = $1',
        [franchiseId]
      );
      return await getFranchiseWithDetails(franchiseId, client);
    });

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
    const isOwner = await verifyFranchiseOwnership(franchiseId, userId);
    if (!isOwner) {
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

    // Delete and re-activate atomically
    await withTransaction(async (client) => {
      await client.query('DELETE FROM franchises WHERE id = $1', [franchiseId]);

      // If this was the active franchise, activate the most recent one
      if (wasActive) {
        await client.query(
          `UPDATE franchises SET is_active = TRUE
           WHERE id = (
             SELECT id FROM franchises WHERE user_id = $1 ORDER BY last_played_at DESC LIMIT 1
           )`,
          [userId]
        );
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Franchise delete error:', error);
    res.status(500).json({ error: 'Failed to delete franchise' });
  }
});

export default router;
