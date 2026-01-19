import { Router } from 'express';
import { pool } from '../db/pool';
import { generateSchedule, validateSchedule } from '../schedule/generator';
import { authMiddleware } from '../auth';
import { getUserActiveFranchise } from '../db/queries';
import { withTransaction } from '../db/transactions';

const router = Router();

router.post('/generate', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(400).json({ error: 'No franchise found. Select a team first.' });
    if (franchise.phase !== 'preseason') return res.status(400).json({ error: 'Can only generate schedule during preseason' });

    const teamsResult = await pool.query('SELECT id, conference, division FROM teams');
    const schedule = generateSchedule(teamsResult.rows);

    if (!validateSchedule(schedule, teamsResult.rows)) {
      console.error('Schedule validation failed - generated invalid schedule');
      return res.status(500).json({ error: 'Schedule generation produced invalid results' });
    }

    await withTransaction(async (client) => {
      const existingResult = await client.query(
        'SELECT COUNT(*) FROM schedule WHERE season_id = $1',
        [franchise.season_id]
      );
      if (parseInt(existingResult.rows[0].count) > 0) {
        throw { status: 400, message: 'Schedule already exists for this season' };
      }

      for (const game of schedule) {
        await client.query(
          `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, game_day)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [franchise.season_id, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, game.game_day]
        );
      }
    });

    res.json({ message: 'Schedule generated successfully', total_games: schedule.length });
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Schedule generation error:', error);
    res.status(500).json({ error: 'Failed to generate schedule' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { team_id, season_id, date, month, include_preseason } = req.query as Record<string, string>;
    const params: any[] = [];
    const conditions: string[] = [];

    if (include_preseason !== 'true') {
      conditions.push(`(s.is_preseason = false OR s.is_preseason IS NULL)`);
    }
    if (season_id) {
      params.push(season_id);
      conditions.push(`s.season_id = $${params.length}`);
    }
    if (team_id) {
      params.push(team_id);
      conditions.push(`(s.home_team_id = $${params.length} OR s.away_team_id = $${params.length})`);
    }
    if (date) {
      params.push(date);
      conditions.push(`s.game_date = $${params.length}`);
    }
    if (month) {
      params.push(month + '-01', month + '-31');
      conditions.push(`s.game_date >= $${params.length - 1} AND s.game_date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT s.*, ht.name as home_team_name, ht.abbreviation as home_abbrev, ht.primary_color as home_color,
              at.name as away_team_name, at.abbreviation as away_abbrev, at.primary_color as away_color,
              g.home_score, g.away_score, g.winner_id
       FROM schedule s
       JOIN teams ht ON s.home_team_id = ht.id
       JOIN teams at ON s.away_team_id = at.id
       LEFT JOIN games g ON s.game_id = g.id
       ${whereClause} ORDER BY s.game_date, s.id`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const teamId = req.query.team_id as string;
    if (!teamId) return res.status(400).json({ error: 'team_id is required' });

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);
    const result = await pool.query(
      `SELECT s.*, ht.name as home_team_name, ht.abbreviation as home_abbrev, ht.primary_color as home_color,
              at.name as away_team_name, at.abbreviation as away_abbrev, at.primary_color as away_color
       FROM schedule s
       JOIN teams ht ON s.home_team_id = ht.id
       JOIN teams at ON s.away_team_id = at.id
       WHERE (s.home_team_id = $1 OR s.away_team_id = $1) AND s.status = 'scheduled'
       ORDER BY s.game_date LIMIT $2`,
      [teamId, limit]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch upcoming games' });
  }
});

export default router;
