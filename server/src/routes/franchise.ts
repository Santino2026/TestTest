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

async function createNewFranchise(
  userId: string,
  team: Team,
  franchiseName: string
): Promise<any> {
  const newSeason = await pool.query(
    `INSERT INTO seasons (season_number, status) VALUES (1, 'preseason') RETURNING id`
  );
  const seasonId = newSeason.rows[0].id;

  const teamsResult = await pool.query('SELECT id, conference, division FROM teams');
  const teams = teamsResult.rows;

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

  const preseasonSchedule = generatePreseasonSchedule(teams);
  const schedule = generateSchedule(teams);
  const allGames = [
    ...preseasonSchedule.map(g => ({ ...g, is_preseason: true })),
    ...schedule.map(g => ({ ...g, is_preseason: false }))
  ];

  const batchSize = 100;
  for (let i = 0; i < allGames.length; i += batchSize) {
    const batch = allGames.slice(i, i + batchSize);
    const values: any[] = [];
    const placeholders: string[] = [];

    batch.forEach((game, idx) => {
      const isUserGame = game.home_team_id === team.id || game.away_team_id === team.id;
      const offset = idx * 8;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
      values.push(seasonId, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame, game.is_preseason, game.game_day);
    });

    await pool.query(
      `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason, game_day)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  const insertResult = await pool.query(
    `INSERT INTO franchises (user_id, team_id, season_id, phase, current_day, name, is_active)
     VALUES ($1, $2, $3, 'preseason', -7, $4, TRUE)
     RETURNING *`,
    [userId, team.id, seasonId, franchiseName]
  );

  await pool.query(
    `UPDATE seasons SET status = 'preseason' WHERE id = $1`,
    [seasonId]
  );

  return insertResult.rows[0];
}

const FRANCHISE_SELECT_QUERY = `
  SELECT f.*, t.name as team_name, t.abbreviation, t.city,
         t.primary_color, t.secondary_color, t.conference, t.division,
         s.wins, s.losses,
         COALESCE(f.preseason_wins, 0) as preseason_wins,
         COALESCE(f.preseason_losses, 0) as preseason_losses
  FROM franchises f
  JOIN teams t ON f.team_id = t.id
  LEFT JOIN standings s ON f.team_id = s.team_id AND f.season_id = s.season_id
`;

router.get('/', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await pool.query(
      `${FRANCHISE_SELECT_QUERY} WHERE f.user_id = $1 AND f.is_active = TRUE`,
      [req.user.userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchise' });
  }
});

router.get('/list', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await pool.query(
      `${FRANCHISE_SELECT_QUERY} WHERE f.user_id = $1 ORDER BY f.last_played_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchises' });
  }
});

async function createFranchiseForUser(
  userId: string,
  teamId: string,
  customName?: string
): Promise<any> {
  const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
  if (teamResult.rows.length === 0) {
    throw { status: 404, message: 'Team not found' };
  }
  const team = teamResult.rows[0];

  await pool.query(
    'UPDATE franchises SET is_active = FALSE WHERE user_id = $1',
    [userId]
  );

  const franchiseName = customName || `${team.city} ${team.name}`;
  const newFranchise = await createNewFranchise(userId, team, franchiseName);
  return getFranchiseWithDetails(newFranchise.id);
}

router.post('/create', authMiddleware(true), async (req: any, res) => {
  try {
    const { team_id, name } = req.body;
    if (!team_id) {
      return res.status(400).json({ error: 'team_id is required' });
    }

    const franchise = await createFranchiseForUser(req.user.userId, team_id, name);
    res.json(franchise);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Franchise create error:', error);
    res.status(500).json({ error: 'Failed to create franchise' });
  }
});

router.post('/select', authMiddleware(true), async (req: any, res) => {
  try {
    const { team_id } = req.body;
    if (!team_id) {
      return res.status(400).json({ error: 'team_id is required' });
    }

    const franchise = await createFranchiseForUser(req.user.userId, team_id);
    res.json(franchise);
  } catch (error: any) {
    console.error('Franchise select error:', error);
    const errorCode = error?.code;

    if (errorCode === '23505') {
      return res.status(400).json({ error: 'Franchise data already exists. Try refreshing the page.' });
    }
    if (errorCode === '23503') {
      return res.status(400).json({ error: 'Invalid team or season data. Please try again.' });
    }
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    res.status(500).json({ error: `Failed to select franchise: ${error?.message || 'Unknown error'}` });
  }
});

router.post('/:id/switch', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const franchiseId = req.params.id;

    const isOwner = await verifyFranchiseOwnership(franchiseId, userId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

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

router.patch('/:id', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const franchiseId = req.params.id;
    const { name, difficulty, auto_save, sim_speed } = req.body;

    const isOwner = await verifyFranchiseOwnership(franchiseId, userId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

    const updateFields: Record<string, any> = {};
    if (name !== undefined) updateFields.name = name;
    if (difficulty !== undefined) updateFields.difficulty = difficulty;
    if (auto_save !== undefined) updateFields.auto_save = auto_save;
    if (sim_speed !== undefined) updateFields.sim_speed = sim_speed;

    const fieldNames = Object.keys(updateFields);
    if (fieldNames.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const setClauses = fieldNames.map((field, i) => `${field} = $${i + 1}`);
    const values = [...Object.values(updateFields), franchiseId];

    await pool.query(
      `UPDATE franchises SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
      values
    );

    const franchise = await getFranchiseWithDetails(franchiseId);
    res.json(franchise);
  } catch (error) {
    console.error('Franchise update error:', error);
    res.status(500).json({ error: 'Failed to update franchise' });
  }
});

router.delete('/:id', authMiddleware(true), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const franchiseId = req.params.id;

    const verifyResult = await pool.query(
      'SELECT id, is_active FROM franchises WHERE id = $1 AND user_id = $2',
      [franchiseId, userId]
    );
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

    const wasActive = verifyResult.rows[0].is_active;

    await withTransaction(async (client) => {
      await client.query('DELETE FROM franchises WHERE id = $1', [franchiseId]);

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
