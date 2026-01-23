import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';
import { getUserActiveFranchise, getSeasonAllStarDay } from '../db/queries';
import { simulateDayGames } from '../services/gameSimulation';
import { withAdvisoryLock } from '../db/transactions';
import {
  selectAllStars,
  getSelectedAllStars,
  getRisingStars,
  simulateRisingStars,
  simulateSkillsChallenge,
  simulateThreePointContest,
  simulateDunkContest,
  simulateAllStarGame,
  getEventResults
} from '../allstar';

const router = Router();

const EVENT_TYPES = ['rising_stars', 'skills', 'three_point', 'dunk', 'game'] as const;

router.get('/state', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    const seasonId = franchise.season_id;
    const [allStarDay, events, selections] = await Promise.all([
      getSeasonAllStarDay(seasonId),
      getEventResults(seasonId),
      getSelectedAllStars(seasonId)
    ]);

    const completedTypes = new Set(events.map(e => e.event_type));
    const eventsComplete = Object.fromEntries(
      EVENT_TYPES.map(type => [type, completedTypes.has(type)])
    ) as Record<typeof EVENT_TYPES[number], boolean>;

    const allEventsComplete = EVENT_TYPES.every(type => completedTypes.has(type));

    res.json({
      season_id: seasonId,
      all_star_day: allStarDay,
      current_day: franchise.current_day,
      is_all_star_weekend: franchise.phase === 'all_star',
      all_star_complete: franchise.all_star_complete || allEventsComplete,
      selections_made: selections.east.length > 0 || selections.west.length > 0,
      events_complete: eventsComplete,
      all_events_complete: allEventsComplete,
    });
  } catch (error) {
    console.error('All-Star state error:', error);
    res.status(500).json({ error: 'Failed to get All-Star state' });
  }
});

function mapAllStar(p: any) {
  return {
    player_id: p.player_id,
    name: `${p.first_name} ${p.last_name}`,
    team: p.team_name,
    position: p.position,
    is_starter: p.is_starter,
    is_captain: p.is_captain,
  };
}

router.post('/select', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    const seasonId = franchise.season_id;
    const existingResult = await pool.query(
      `SELECT COUNT(*) FROM all_star_selections WHERE season_id = $1`,
      [seasonId]
    );
    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'All-Star selections already made' });
    }

    const { player_id } = req.body || {};
    let userPickConference: 'Eastern' | 'Western' | null = null;

    if (player_id) {
      const playerResult = await pool.query(
        `SELECT t.conference FROM players p JOIN teams t ON p.team_id = t.id WHERE p.id = $1 AND p.team_id = $2`,
        [player_id, franchise.team_id]
      );
      if (playerResult.rows.length === 0) {
        return res.status(400).json({ error: 'Player not found on your roster' });
      }
      userPickConference = playerResult.rows[0].conference;
    }

    const [eastStars, westStars] = await Promise.all([
      selectAllStars(seasonId, 'Eastern', userPickConference === 'Eastern' ? player_id : undefined),
      selectAllStars(seasonId, 'Western', userPickConference === 'Western' ? player_id : undefined)
    ]);

    res.json({
      message: 'All-Star selections complete',
      east: eastStars.map(mapAllStar),
      west: westStars.map(mapAllStar),
    });
  } catch (error) {
    console.error('All-Star selection error:', error);
    res.status(500).json({ error: 'Failed to select All-Stars' });
  }
});

router.get('/rosters', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    const selections = await getSelectedAllStars(franchise.season_id);
    res.json({
      east: selections.east,
      west: selections.west,
      east_captain: selections.east.find((p: any) => p.is_captain),
      west_captain: selections.west.find((p: any) => p.is_captain),
    });
  } catch (error) {
    console.error('All-Star rosters error:', error);
    res.status(500).json({ error: 'Failed to get All-Star rosters' });
  }
});

router.get('/rising-stars', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    res.json(await getRisingStars(franchise.season_id));
  } catch (error) {
    console.error('Rising stars error:', error);
    res.status(500).json({ error: 'Failed to get Rising Stars' });
  }
});

async function checkEventExists(seasonId: string, eventType: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM all_star_events WHERE season_id = $1 AND event_type = $2`,
    [seasonId, eventType]
  );
  return result.rows.length > 0;
}

router.post('/simulate/rising-stars', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    if (await checkEventExists(franchise.season_id, 'rising_stars')) {
      return res.status(400).json({ error: 'Rising Stars already simulated' });
    }
    res.json(await simulateRisingStars(franchise.season_id));
  } catch (error) {
    console.error('Rising Stars simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate Rising Stars' });
  }
});

router.post('/simulate/skills', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    if (await checkEventExists(franchise.season_id, 'skills')) {
      return res.status(400).json({ error: 'Skills Challenge already simulated' });
    }
    res.json(await simulateSkillsChallenge(franchise.season_id));
  } catch (error) {
    console.error('Skills Challenge simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate Skills Challenge' });
  }
});

router.post('/simulate/three-point', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    if (await checkEventExists(franchise.season_id, 'three_point')) {
      return res.status(400).json({ error: 'Three-Point Contest already simulated' });
    }
    res.json(await simulateThreePointContest(franchise.season_id));
  } catch (error) {
    console.error('Three-Point Contest simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate Three-Point Contest' });
  }
});

router.post('/simulate/dunk', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    if (await checkEventExists(franchise.season_id, 'dunk')) {
      return res.status(400).json({ error: 'Dunk Contest already simulated' });
    }
    res.json(await simulateDunkContest(franchise.season_id));
  } catch (error) {
    console.error('Dunk Contest simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate Dunk Contest' });
  }
});

router.post('/simulate/game', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    const seasonId = franchise.season_id;
    const selectionsResult = await pool.query(
      `SELECT COUNT(*) FROM all_star_selections WHERE season_id = $1`,
      [seasonId]
    );
    if (parseInt(selectionsResult.rows[0].count) === 0) {
      return res.status(400).json({ error: 'Must select All-Stars first' });
    }

    if (await checkEventExists(seasonId, 'game')) {
      return res.status(400).json({ error: 'All-Star Game already simulated' });
    }

    res.json(await simulateAllStarGame(seasonId));
  } catch (error) {
    console.error('All-Star Game simulation error:', error);
    res.status(500).json({
      error: 'Failed to simulate All-Star Game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const EVENT_SIMULATORS: Record<string, (seasonId: string) => Promise<any>> = {
  rising_stars: simulateRisingStars,
  skills: simulateSkillsChallenge,
  three_point: simulateThreePointContest,
  dunk: simulateDunkContest,
  game: simulateAllStarGame
};

router.post('/simulate/all', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    const seasonId = franchise.season_id;

    const result = await withAdvisoryLock(`allstar-${seasonId}`, async (client) => {
      const selectionsResult = await client.query(
        `SELECT COUNT(*) FROM all_star_selections WHERE season_id = $1`,
        [seasonId]
      );

      if (parseInt(selectionsResult.rows[0].count) === 0) {
        await Promise.all([
          selectAllStars(seasonId, 'Eastern'),
          selectAllStars(seasonId, 'Western')
        ]);
      }

      const existingEvents = await getEventResults(seasonId);
      const completedTypes = new Set(existingEvents.map(e => e.event_type));

      const results: any[] = [];
      for (const eventType of EVENT_TYPES) {
        if (!completedTypes.has(eventType)) {
          results.push(await EVENT_SIMULATORS[eventType](seasonId));
        }
      }

      await client.query(`UPDATE franchises SET all_star_complete = TRUE WHERE id = $1`, [franchise.id]);

      return { message: 'All-Star Weekend complete!', events_simulated: results.length, results };
    });

    res.json(result);
  } catch (error) {
    console.error('Simulate all error:', error);
    res.status(500).json({ error: 'Failed to simulate All-Star Weekend' });
  }
});

router.get('/results', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    res.json({ events: await getEventResults(franchise.season_id) });
  } catch (error) {
    console.error('Event results error:', error);
    res.status(500).json({ error: 'Failed to get event results' });
  }
});

router.post('/complete', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No active franchise' });

    const allStarDay = await getSeasonAllStarDay(franchise.season_id);
    for (let day = allStarDay; day < allStarDay + 4; day++) {
      await simulateDayGames({ ...franchise, current_day: day });
    }

    await pool.query(
      `UPDATE franchises
       SET phase = 'regular_season', all_star_complete = TRUE, current_day = GREATEST(current_day, 89)
       WHERE id = $1`,
      [franchise.id]
    );

    res.json({
      message: 'All-Star Weekend complete! Returning to regular season.',
      new_phase: 'regular_season',
      current_day: Math.max(franchise.current_day, 89)
    });
  } catch (error) {
    console.error('Complete All-Star error:', error);
    res.status(500).json({ error: 'Failed to complete All-Star Weekend' });
  }
});

export default router;
