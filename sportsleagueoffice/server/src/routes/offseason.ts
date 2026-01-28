import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool.js';
import { generateSchedule, validateSchedule } from '../schedule/generator.js';
import { assertValidSchedule } from '../schedule/validation.js';

const router = Router();

interface AuthRequest extends Request {
  userId?: string;
}

// POST /api/offseason/new - Start a new season
router.post('/new', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get user's franchise
    const franchiseResult = await client.query(
      `SELECT f.*, s.year as current_year
       FROM franchises f
       JOIN seasons s ON f.current_season_id = s.id
       WHERE f.user_id = $1`,
      [userId]
    );

    if (franchiseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No franchise found' });
    }

    const franchise = franchiseResult.rows[0];
    const newYear = franchise.current_year + 1;

    // Create new season
    const newSeasonId = uuidv4();

    await client.query(
      `INSERT INTO seasons (id, year, phase, current_day)
       VALUES ($1, $2, 'preseason', 1)`,
      [newSeasonId, newYear]
    );

    // Get all teams for schedule generation
    const teamsResult = await client.query('SELECT * FROM teams ORDER BY conference, division');
    const teams = teamsResult.rows;

    if (teams.length !== 30) {
      throw new Error(`Expected 30 teams for schedule generation, found ${teams.length}`);
    }

    // Generate schedule
    const schedule = generateSchedule(teams, newSeasonId);

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
          newSeasonId,
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
    await assertValidSchedule(newSeasonId, client);

    // Update franchise to point to new season
    await client.query(
      `UPDATE franchises SET current_season_id = $1 WHERE id = $2`,
      [newSeasonId, franchise.id]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      season_id: newSeasonId,
      year: newYear,
      total_games: schedule.length,
      regular_season_games: schedule.filter((g) => !g.is_preseason).length,
      preseason_games: schedule.filter((g) => g.is_preseason).length,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Start new season error:', error);
    return res.status(500).json({
      error: 'Failed to start new season',
      details: (error as Error).message,
    });
  } finally {
    client.release();
  }
});

// GET /api/offseason/status - Get offseason status
router.get('/status', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      `SELECT s.phase, s.year
       FROM franchises f
       JOIN seasons s ON f.current_season_id = s.id
       WHERE f.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    const season = result.rows[0];

    return res.json({
      phase: season.phase,
      year: season.year,
      can_start_new_season: season.phase === 'offseason',
    });
  } catch (error) {
    console.error('Get offseason status error:', error);
    return res.status(500).json({ error: 'Failed to get offseason status' });
  }
});

export default router;
