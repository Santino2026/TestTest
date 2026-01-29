import { Router } from 'express';
import { authMiddleware } from '../auth';
import { getUserActiveFranchise } from '../db/queries';
import { withAdvisoryLock, lockUserActiveFranchise } from '../db/transactions';
import { simulatePreseasonDayGames, simulateAllPreseasonGamesBulk } from '../services/gameSimulation';

const router = Router();

router.post('/', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });
    if (franchise.phase !== 'preseason') return res.status(400).json({ error: 'Not in preseason' });

    const result = await withAdvisoryLock(`season-advance-${franchise.id}`, async (client) => {
      const locked = await lockUserActiveFranchise(client, req.user.userId);
      if (!locked || locked.phase !== 'preseason') throw { status: 400, message: 'Not in preseason' };

      const { gameDateStr, results, userGameResult } = await simulatePreseasonDayGames(locked);
      const newDay = locked.current_day + 1;
      const preseasonComplete = newDay > 0;
      const newPhase = preseasonComplete ? 'regular_season' : 'preseason';
      const finalDay = preseasonComplete ? 1 : newDay;

      if (preseasonComplete) {
        await client.query(`UPDATE seasons SET status = 'regular' WHERE id = $1`, [locked.season_id]);
      }
      await client.query(
        `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW() WHERE id = $3`,
        [finalDay, newPhase, locked.id]
      );

      return { day: newDay, date: gameDateStr, phase: newPhase, games_played: results.length, results, user_game_result: userGameResult, preseason_complete: preseasonComplete };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Advance preseason day error:', error);
    res.status(500).json({ error: 'Failed to advance preseason day' });
  }
});

router.post('/all', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });
    if (franchise.phase !== 'preseason') return res.status(400).json({ error: 'Not in preseason' });

    const result = await withAdvisoryLock(`season-advance-${franchise.id}`, async (client) => {
      const locked = await lockUserActiveFranchise(client, req.user.userId);
      if (!locked || locked.phase !== 'preseason') throw { status: 400, message: 'Not in preseason' };

      // Use bulk simulation for "Simulate All"
      const { games_played, user_wins, user_losses } = await simulateAllPreseasonGamesBulk(locked);

      // Update franchise preseason record
      if (user_wins > 0 || user_losses > 0) {
        await client.query(
          `UPDATE franchises SET preseason_wins = COALESCE(preseason_wins, 0) + $1, preseason_losses = COALESCE(preseason_losses, 0) + $2 WHERE id = $3`,
          [user_wins, user_losses, locked.id]
        );
      }

      await client.query(`UPDATE seasons SET status = 'regular' WHERE id = $1`, [locked.season_id]);
      await client.query(
        `UPDATE franchises SET current_day = 1, phase = 'regular_season', last_played_at = NOW() WHERE id = $1`,
        [locked.id]
      );

      return {
        message: 'Preseason complete!',
        phase: 'regular_season',
        current_day: 1,
        games_played,
        user_record: { wins: user_wins, losses: user_losses }
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Simulate all preseason error:', error);
    res.status(500).json({ error: 'Failed to simulate preseason' });
  }
});

export default router;
