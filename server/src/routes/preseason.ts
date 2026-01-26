import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';
import { getUserActiveFranchise } from '../db/queries';
import { withTransaction } from '../db/transactions';
import { simulatePreseasonDayGames, simulateAllPreseasonGames } from '../services/gameSimulation';

const router = Router();

router.post('/', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }
    if (franchise.phase !== 'preseason') {
      return res.status(400).json({ error: 'Not in preseason' });
    }

    const { gameDateStr, results, userGameResult } = await simulatePreseasonDayGames(franchise);

    const newDay = franchise.current_day + 1;
    const preseasonComplete = newDay > 0;
    const newPhase = preseasonComplete ? 'regular_season' : 'preseason';
    const finalDay = preseasonComplete ? 1 : newDay;

    await withTransaction(async (client) => {
      if (preseasonComplete) {
        await client.query(
          `UPDATE seasons SET status = 'regular' WHERE id = $1`,
          [franchise.season_id]
        );
      }
      await client.query(
        `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW() WHERE id = $3`,
        [finalDay, newPhase, franchise.id]
      );
    });

    res.json({
      day: newDay,
      date: gameDateStr,
      phase: newPhase,
      games_played: results.length,
      results,
      user_game_result: userGameResult,
      preseason_complete: preseasonComplete
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Advance preseason day error:', error);
    res.status(500).json({ error: 'Failed to advance preseason day' });
  }
});

router.post('/all', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }
    if (franchise.phase !== 'preseason') {
      return res.status(400).json({ error: 'Not in preseason' });
    }

    const { daysSimulated, gamesPlayed, userGames } = await simulateAllPreseasonGames(franchise);

    await pool.query(
      `UPDATE seasons SET status = 'regular' WHERE id = $1`,
      [franchise.season_id]
    );
    await pool.query(
      `UPDATE franchises SET current_day = 1, phase = 'regular_season', last_played_at = NOW() WHERE id = $1`,
      [franchise.id]
    );

    res.json({
      message: 'Preseason complete!',
      days_simulated: daysSimulated,
      phase: 'regular_season',
      current_day: 1,
      games_played: gamesPlayed,
      user_games: userGames
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Simulate all preseason error:', error);
    res.status(500).json({ error: 'Failed to simulate preseason' });
  }
});

export default router;
