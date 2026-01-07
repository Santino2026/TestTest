import { Router } from 'express';
import { pool } from '../db/pool';
import { generateSchedule, validateSchedule } from '../schedule/generator';
import { authMiddleware } from '../auth';
import { getUserActiveFranchise } from '../db/queries';
import { withTransaction } from '../db/transactions';

const router = Router();

// Generate schedule for current season
router.post('/generate', authMiddleware(true), async (req: any, res) => {
  try {
    // Verify user has an active franchise
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(400).json({ error: 'No franchise found. Select a team first.' });
    }

    const seasonId = franchise.season_id;

    if (franchise.phase !== 'preseason') {
      return res.status(400).json({ error: 'Can only generate schedule during preseason' });
    }

    // Get all teams (idempotent read)
    const teamsResult = await pool.query(
      'SELECT id, conference, division FROM teams'
    );
    const teams = teamsResult.rows;

    // Generate schedule (deterministic based on teams)
    const schedule = generateSchedule(teams);

    // Validate schedule before saving
    if (!validateSchedule(schedule, teams)) {
      console.error('Schedule validation failed - generated invalid schedule');
      return res.status(500).json({ error: 'Schedule generation produced invalid results' });
    }

    // Wrap check + insert in transaction to prevent race conditions
    await withTransaction(async (client) => {
      // Check if schedule already exists inside transaction
      const existingResult = await client.query(
        'SELECT COUNT(*) FROM schedule WHERE season_id = $1',
        [seasonId]
      );
      if (parseInt(existingResult.rows[0].count) > 0) {
        throw { status: 400, message: 'Schedule already exists for this season' };
      }

      // Insert schedule into database
      for (const game of schedule) {
        await client.query(
          `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [seasonId, game.home_team_id, game.away_team_id,
           game.game_number_home, game.game_date]
        );
      }
    });

    res.json({
      message: 'Schedule generated successfully',
      total_games: schedule.length
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Schedule generation error:', error);
    res.status(500).json({ error: 'Failed to generate schedule' });
  }
});

// Get schedule for a team or all games on a date
router.get('/', async (req, res) => {
  try {
    const teamId = req.query.team_id as string;
    const seasonId = req.query.season_id as string;
    const date = req.query.date as string;
    const month = req.query.month as string;

    let query = `
      SELECT s.*,
             ht.name as home_team_name, ht.abbreviation as home_abbrev,
             ht.primary_color as home_color,
             at.name as away_team_name, at.abbreviation as away_abbrev,
             at.primary_color as away_color,
             g.home_score, g.away_score, g.winner_id
       FROM schedule s
       JOIN teams ht ON s.home_team_id = ht.id
       JOIN teams at ON s.away_team_id = at.id
       LEFT JOIN games g ON s.game_id = g.id
       WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by season_id (required for proper data isolation)
    if (seasonId) {
      params.push(seasonId);
      query += ` AND s.season_id = $${params.length}`;
    }

    if (teamId) {
      params.push(teamId);
      query += ` AND (s.home_team_id = $${params.length} OR s.away_team_id = $${params.length})`;
    }

    if (date) {
      params.push(date);
      query += ` AND s.game_date = $${params.length}`;
    }

    if (month) {
      // Format: YYYY-MM
      params.push(month + '-01');
      params.push(month + '-31');
      query += ` AND s.game_date >= $${params.length - 1} AND s.game_date <= $${params.length}`;
    }

    query += ` ORDER BY s.game_date, s.id`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Get next N upcoming games for a team
router.get('/upcoming', async (req, res) => {
  try {
    const teamId = req.query.team_id as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    if (!teamId) {
      return res.status(400).json({ error: 'team_id is required' });
    }

    const result = await pool.query(
      `SELECT s.*,
              ht.name as home_team_name, ht.abbreviation as home_abbrev,
              ht.primary_color as home_color,
              at.name as away_team_name, at.abbreviation as away_abbrev,
              at.primary_color as away_color
       FROM schedule s
       JOIN teams ht ON s.home_team_id = ht.id
       JOIN teams at ON s.away_team_id = at.id
       WHERE (s.home_team_id = $1 OR s.away_team_id = $1)
         AND s.status = 'scheduled'
       ORDER BY s.game_date
       LIMIT $2`,
      [teamId, limit]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch upcoming games' });
  }
});

export default router;
