import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool.js';
import { generateSchedule, validateSchedule } from '../schedule/generator.js';
import { assertValidSchedule } from '../schedule/validation.js';

const router = Router();

interface AuthRequest extends Request {
  userId?: string;
}

// GET /api/franchise - Get current user's franchise
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      `SELECT f.*, t.name as team_name, t.abbreviation as team_abbr,
              s.year as season_year, s.phase as season_phase
       FROM franchises f
       LEFT JOIN teams t ON f.team_id = t.id
       LEFT JOIN seasons s ON f.current_season_id = s.id
       WHERE f.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get franchise error:', error);
    return res.status(500).json({ error: 'Failed to get franchise' });
  }
});

// POST /api/franchise/select - Select a team and create franchise
router.post('/select', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { team_id } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!team_id) {
    return res.status(400).json({ error: 'team_id is required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user already has a franchise
    const existingFranchise = await client.query(
      'SELECT id FROM franchises WHERE user_id = $1',
      [userId]
    );

    if (existingFranchise.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User already has a franchise' });
    }

    // Verify team exists
    const team = await client.query('SELECT * FROM teams WHERE id = $1', [team_id]);
    if (team.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Team not found' });
    }

    // Create season
    const seasonId = uuidv4();
    const currentYear = new Date().getFullYear();

    await client.query(
      `INSERT INTO seasons (id, year, phase, current_day)
       VALUES ($1, $2, 'preseason', 1)`,
      [seasonId, currentYear]
    );

    // Create franchise
    const franchiseId = uuidv4();

    await client.query(
      `INSERT INTO franchises (id, user_id, team_id, current_season_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [franchiseId, userId, team_id, seasonId]
    );

    // Get all teams for schedule generation
    const teamsResult = await client.query('SELECT * FROM teams ORDER BY conference, division');
    const teams = teamsResult.rows;

    if (teams.length !== 30) {
      throw new Error(`Expected 30 teams for schedule generation, found ${teams.length}`);
    }

    // Generate schedule
    const schedule = generateSchedule(teams, seasonId);

    // Validate schedule before inserting
    const validation = validateSchedule(schedule, teams);
    if (!validation.valid) {
      throw new Error(`Schedule generation failed validation: ${validation.issues.join('; ')}`);
    }

    // Batch insert schedule
    const batchSize = 100;
    for (let i = 0; i < schedule.length; i += batchSize) {
      const batch = schedule.slice(i, i + batchSize);
      const insertValues: string[] = [];
      const insertParams: unknown[] = [];
      let paramIndex = 1;

      for (const game of batch) {
        insertValues.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );
        insertParams.push(
          game.id,
          seasonId,
          game.home_team_id,
          game.away_team_id,
          game.game_date,
          game.game_day,
          game.is_preseason
        );
      }

      await client.query(
        `INSERT INTO schedule (id, season_id, home_team_id, away_team_id, game_date, game_day, is_preseason)
         VALUES ${insertValues.join(', ')}`,
        insertParams
      );
    }

    // Validate schedule was inserted correctly
    await assertValidSchedule(seasonId, client);

    await client.query('COMMIT');

    return res.json({
      success: true,
      franchise_id: franchiseId,
      season_id: seasonId,
      team: team.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Select franchise error:', error);
    return res.status(500).json({
      error: 'Failed to create franchise',
      details: (error as Error).message,
    });
  } finally {
    client.release();
  }
});

export default router;
