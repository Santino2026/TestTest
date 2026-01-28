import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { generateSchedule, validateSchedule } from '../schedule/generator.js';

const router = Router();

interface TeamGameCount {
  team_id: string;
  team_name: string;
  abbreviation: string;
  total_games: number;
  home_games: number;
  away_games: number;
  preseason_games: number;
  regular_games: number;
  null_game_day_count: number;
  null_preseason_flag_count: number;
}

interface AuditResult {
  season_id: string;
  total_games: number;
  expected_total: number;
  teams_with_wrong_count: TeamGameCount[];
  games_with_null_game_day: number;
  games_with_null_preseason: number;
  issues: string[];
}

// GET /api/schedule/audit - Diagnose schedule issues
router.get('/audit', async (req: Request, res: Response) => {
  const { season_id } = req.query;

  if (!season_id) {
    return res.status(400).json({ error: 'season_id query parameter is required' });
  }

  try {
    // Get total games for the season
    const totalGamesResult = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE is_preseason = true) as preseason,
              COUNT(*) FILTER (WHERE is_preseason = false OR is_preseason IS NULL) as regular,
              COUNT(*) FILTER (WHERE game_day IS NULL) as null_game_day,
              COUNT(*) FILTER (WHERE is_preseason IS NULL) as null_preseason
       FROM schedule
       WHERE season_id = $1`,
      [season_id]
    );

    const totals = totalGamesResult.rows[0];
    const expectedRegularSeasonGames = 1230; // 30 teams × 82 games / 2

    // Get per-team breakdown
    const perTeamResult = await pool.query(
      `WITH team_games AS (
        SELECT
          t.id as team_id,
          t.name as team_name,
          t.abbreviation,
          COUNT(*) as total_games,
          COUNT(*) FILTER (WHERE s.home_team_id = t.id) as home_games,
          COUNT(*) FILTER (WHERE s.away_team_id = t.id) as away_games,
          COUNT(*) FILTER (WHERE s.is_preseason = true) as preseason_games,
          COUNT(*) FILTER (WHERE s.is_preseason = false) as regular_games,
          COUNT(*) FILTER (WHERE s.game_day IS NULL) as null_game_day_count,
          COUNT(*) FILTER (WHERE s.is_preseason IS NULL) as null_preseason_flag_count
        FROM teams t
        LEFT JOIN schedule s ON (s.home_team_id = t.id OR s.away_team_id = t.id)
          AND s.season_id = $1
        GROUP BY t.id, t.name, t.abbreviation
      )
      SELECT * FROM team_games
      WHERE regular_games != 82
      ORDER BY regular_games ASC`,
      [season_id]
    );

    const teamsWithWrongCount: TeamGameCount[] = perTeamResult.rows;

    const issues: string[] = [];

    if (parseInt(totals.regular) !== expectedRegularSeasonGames) {
      issues.push(`Expected ${expectedRegularSeasonGames} regular season games, found ${totals.regular}`);
    }

    if (parseInt(totals.null_game_day) > 0) {
      issues.push(`${totals.null_game_day} games have NULL game_day`);
    }

    if (parseInt(totals.null_preseason) > 0) {
      issues.push(`${totals.null_preseason} games have NULL is_preseason flag`);
    }

    if (teamsWithWrongCount.length > 0) {
      issues.push(`${teamsWithWrongCount.length} teams do not have exactly 82 regular season games`);
    }

    const audit: AuditResult = {
      season_id: season_id as string,
      total_games: parseInt(totals.total),
      expected_total: expectedRegularSeasonGames + 120, // 120 preseason games (30 teams × 8 / 2)
      teams_with_wrong_count: teamsWithWrongCount,
      games_with_null_game_day: parseInt(totals.null_game_day),
      games_with_null_preseason: parseInt(totals.null_preseason),
      issues,
    };

    return res.json(audit);
  } catch (error) {
    console.error('Schedule audit error:', error);
    return res.status(500).json({ error: 'Failed to audit schedule' });
  }
});

// POST /api/schedule/repair - Fix schedule data issues
router.post('/repair', async (req: Request, res: Response) => {
  const { season_id } = req.body;

  if (!season_id) {
    return res.status(400).json({ error: 'season_id is required in request body' });
  }

  const repairs: string[] = [];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fix NULL is_preseason flags
    // Games during regular season dates should be is_preseason = false
    const fixPreseasonResult = await client.query(
      `UPDATE schedule
       SET is_preseason = false
       WHERE season_id = $1
         AND is_preseason IS NULL
         AND game_day > 8
       RETURNING id`,
      [season_id]
    );

    if (fixPreseasonResult.rowCount && fixPreseasonResult.rowCount > 0) {
      repairs.push(`Fixed ${fixPreseasonResult.rowCount} games with NULL is_preseason (set to false)`);
    }

    // Fix preseason games that might have NULL flag
    const fixPreseasonTrueResult = await client.query(
      `UPDATE schedule
       SET is_preseason = true
       WHERE season_id = $1
         AND is_preseason IS NULL
         AND game_day <= 8
       RETURNING id`,
      [season_id]
    );

    if (fixPreseasonTrueResult.rowCount && fixPreseasonTrueResult.rowCount > 0) {
      repairs.push(`Fixed ${fixPreseasonTrueResult.rowCount} preseason games with NULL is_preseason (set to true)`);
    }

    // Regenerate game_day values if inconsistent
    // First, check for games with NULL game_day
    const nullGameDayResult = await client.query(
      `SELECT COUNT(*) as count
       FROM schedule
       WHERE season_id = $1 AND game_day IS NULL`,
      [season_id]
    );

    if (parseInt(nullGameDayResult.rows[0].count) > 0) {
      // Get the season start date and recalculate game_day from game_date
      const gamesWithNullDay = await client.query(
        `UPDATE schedule s
         SET game_day = EXTRACT(DOY FROM s.game_date) -
           (SELECT EXTRACT(DOY FROM MIN(game_date)) FROM schedule WHERE season_id = $1) + 1
         WHERE s.season_id = $1 AND s.game_day IS NULL
         RETURNING id`,
        [season_id]
      );

      if (gamesWithNullDay.rowCount && gamesWithNullDay.rowCount > 0) {
        repairs.push(`Regenerated game_day for ${gamesWithNullDay.rowCount} games`);
      }
    }

    await client.query('COMMIT');

    // Run audit after repairs to show current state
    const auditResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE is_preseason = false) as regular_games
       FROM schedule
       WHERE season_id = $1`,
      [season_id]
    );

    return res.json({
      success: true,
      repairs,
      regular_games_after_repair: parseInt(auditResult.rows[0].regular_games),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Schedule repair error:', error);
    return res.status(500).json({ error: 'Failed to repair schedule' });
  } finally {
    client.release();
  }
});

// GET /api/schedule - Get schedule (existing endpoint)
router.get('/', async (req: Request, res: Response) => {
  const { team, date, month, season_id } = req.query;

  try {
    let query = `
      SELECT s.*,
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM schedule s
      JOIN teams ht ON s.home_team_id = ht.id
      JOIN teams at ON s.away_team_id = at.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (season_id) {
      query += ` AND s.season_id = $${paramIndex++}`;
      params.push(season_id as string);
    }

    if (team) {
      query += ` AND (s.home_team_id = $${paramIndex} OR s.away_team_id = $${paramIndex})`;
      params.push(team as string);
      paramIndex++;
    }

    if (date) {
      query += ` AND s.game_date = $${paramIndex++}`;
      params.push(date as string);
    }

    if (month) {
      query += ` AND EXTRACT(MONTH FROM s.game_date) = $${paramIndex++}`;
      params.push(parseInt(month as string));
    }

    query += ` ORDER BY s.game_date, s.game_time`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Get schedule error:', error);
    return res.status(500).json({ error: 'Failed to get schedule' });
  }
});

// GET /api/schedule/upcoming - Get upcoming games
router.get('/upcoming', async (req: Request, res: Response) => {
  const { team_id, season_id, limit = 10 } = req.query;

  try {
    const result = await pool.query(
      `SELECT s.*,
              ht.name as home_team_name, ht.abbreviation as home_team_abbr,
              at.name as away_team_name, at.abbreviation as away_team_abbr
       FROM schedule s
       JOIN teams ht ON s.home_team_id = ht.id
       JOIN teams at ON s.away_team_id = at.id
       WHERE s.season_id = $1
         AND s.is_played = false
         AND (s.home_team_id = $2 OR s.away_team_id = $2)
       ORDER BY s.game_date, s.game_time
       LIMIT $3`,
      [season_id, team_id, parseInt(limit as string)]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get upcoming schedule error:', error);
    return res.status(500).json({ error: 'Failed to get upcoming schedule' });
  }
});

// POST /api/schedule/generate - Generate schedule for season
router.post('/generate', async (req: Request, res: Response) => {
  const { season_id } = req.body;

  if (!season_id) {
    return res.status(400).json({ error: 'season_id is required' });
  }

  try {
    // Get all teams
    const teamsResult = await pool.query('SELECT * FROM teams ORDER BY conference, division');
    const teams = teamsResult.rows;

    if (teams.length !== 30) {
      return res.status(400).json({ error: `Expected 30 teams, found ${teams.length}` });
    }

    // Generate the schedule
    const schedule = generateSchedule(teams, season_id);

    // Validate before inserting
    const validation = validateSchedule(schedule, teams);
    if (!validation.valid) {
      return res.status(500).json({
        error: 'Schedule validation failed before insert',
        issues: validation.issues,
      });
    }

    // Insert into database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing schedule for this season
      await client.query('DELETE FROM schedule WHERE season_id = $1', [season_id]);

      // Batch insert games
      const insertValues: string[] = [];
      const insertParams: unknown[] = [];
      let paramIndex = 1;

      for (const game of schedule) {
        insertValues.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );
        insertParams.push(
          game.id,
          season_id,
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

      // Validate after insert
      const verificationResult = await client.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE is_preseason = false) as regular
         FROM schedule
         WHERE season_id = $1`,
        [season_id]
      );

      const regularGames = parseInt(verificationResult.rows[0].regular);
      const expectedRegularGames = 1230;

      if (regularGames !== expectedRegularGames) {
        throw new Error(`Schedule insert verification failed: expected ${expectedRegularGames} regular games, got ${regularGames}`);
      }

      // Verify each team has 82 games
      const teamVerification = await client.query(
        `SELECT t.abbreviation, COUNT(*) as game_count
         FROM teams t
         LEFT JOIN schedule s ON (s.home_team_id = t.id OR s.away_team_id = t.id)
           AND s.season_id = $1 AND s.is_preseason = false
         GROUP BY t.id, t.abbreviation
         HAVING COUNT(*) != 82`,
        [season_id]
      );

      if (teamVerification.rows.length > 0) {
        const badTeams = teamVerification.rows.map((r) => `${r.abbreviation}: ${r.game_count}`).join(', ');
        throw new Error(`Teams with incorrect game counts: ${badTeams}`);
      }

      await client.query('COMMIT');

      return res.json({
        success: true,
        total_games: schedule.length,
        regular_season_games: regularGames,
        preseason_games: schedule.length - regularGames,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Generate schedule error:', error);
    return res.status(500).json({ error: 'Failed to generate schedule', details: (error as Error).message });
  }
});

export default router;
