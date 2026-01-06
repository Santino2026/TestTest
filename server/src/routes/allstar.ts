// All-Star Weekend API Routes
import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';
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

// Get All-Star Weekend state
router.get('/state', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT f.*, s.all_star_day
       FROM franchises f
       JOIN seasons s ON f.season_id = s.id
       WHERE f.user_id = $1 AND f.is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const franchise = franchiseResult.rows[0];
    const seasonId = franchise.season_id;

    // Get event results
    const events = await getEventResults(seasonId);

    // Get All-Star selections
    const selections = await getSelectedAllStars(seasonId);

    // Determine what's complete
    const eventsComplete = {
      rising_stars: events.some(e => e.event_type === 'rising_stars'),
      skills: events.some(e => e.event_type === 'skills'),
      three_point: events.some(e => e.event_type === 'three_point'),
      dunk: events.some(e => e.event_type === 'dunk'),
      game: events.some(e => e.event_type === 'game'),
    };

    const allEventsComplete = Object.values(eventsComplete).every(v => v);

    res.json({
      season_id: seasonId,
      all_star_day: franchise.all_star_day || 85,
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

// Generate All-Star selections
router.post('/select', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;

    // Check if already selected
    const existingResult = await pool.query(
      `SELECT COUNT(*) FROM all_star_selections WHERE season_id = $1`,
      [seasonId]
    );

    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'All-Star selections already made' });
    }

    // Select All-Stars for both conferences
    const eastStars = await selectAllStars(seasonId, 'Eastern');
    const westStars = await selectAllStars(seasonId, 'Western');

    res.json({
      message: 'All-Star selections complete',
      east: eastStars.map(p => ({
        player_id: p.player_id,
        name: `${p.first_name} ${p.last_name}`,
        team: p.team_name,
        position: p.position,
        is_starter: (p as any).is_starter,
        is_captain: (p as any).is_captain,
      })),
      west: westStars.map(p => ({
        player_id: p.player_id,
        name: `${p.first_name} ${p.last_name}`,
        team: p.team_name,
        position: p.position,
        is_starter: (p as any).is_starter,
        is_captain: (p as any).is_captain,
      })),
    });
  } catch (error) {
    console.error('All-Star selection error:', error);
    res.status(500).json({ error: 'Failed to select All-Stars' });
  }
});

// Get All-Star rosters
router.get('/rosters', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;
    const selections = await getSelectedAllStars(seasonId);

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

// Get Rising Stars rosters
router.get('/rising-stars', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;
    const risingStars = await getRisingStars(seasonId);

    res.json(risingStars);
  } catch (error) {
    console.error('Rising stars error:', error);
    res.status(500).json({ error: 'Failed to get Rising Stars' });
  }
});

// Simulate Rising Stars Challenge
router.post('/simulate/rising-stars', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;

    // Check if already simulated
    const existingResult = await pool.query(
      `SELECT * FROM all_star_events WHERE season_id = $1 AND event_type = 'rising_stars'`,
      [seasonId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Rising Stars already simulated' });
    }

    const result = await simulateRisingStars(seasonId);
    res.json(result);
  } catch (error) {
    console.error('Rising Stars simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate Rising Stars' });
  }
});

// Simulate Skills Challenge
router.post('/simulate/skills', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;

    const existingResult = await pool.query(
      `SELECT * FROM all_star_events WHERE season_id = $1 AND event_type = 'skills'`,
      [seasonId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Skills Challenge already simulated' });
    }

    const result = await simulateSkillsChallenge(seasonId);
    res.json(result);
  } catch (error) {
    console.error('Skills Challenge simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate Skills Challenge' });
  }
});

// Simulate Three-Point Contest
router.post('/simulate/three-point', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;

    const existingResult = await pool.query(
      `SELECT * FROM all_star_events WHERE season_id = $1 AND event_type = 'three_point'`,
      [seasonId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Three-Point Contest already simulated' });
    }

    const result = await simulateThreePointContest(seasonId);
    res.json(result);
  } catch (error) {
    console.error('Three-Point Contest simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate Three-Point Contest' });
  }
});

// Simulate Dunk Contest
router.post('/simulate/dunk', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;

    const existingResult = await pool.query(
      `SELECT * FROM all_star_events WHERE season_id = $1 AND event_type = 'dunk'`,
      [seasonId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Dunk Contest already simulated' });
    }

    const result = await simulateDunkContest(seasonId);
    res.json(result);
  } catch (error) {
    console.error('Dunk Contest simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate Dunk Contest' });
  }
});

// Simulate All-Star Game
router.post('/simulate/game', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;

    // Check if All-Stars are selected
    const selectionsResult = await pool.query(
      `SELECT COUNT(*) FROM all_star_selections WHERE season_id = $1`,
      [seasonId]
    );

    if (parseInt(selectionsResult.rows[0].count) === 0) {
      return res.status(400).json({ error: 'Must select All-Stars first' });
    }

    const existingResult = await pool.query(
      `SELECT * FROM all_star_events WHERE season_id = $1 AND event_type = 'game'`,
      [seasonId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'All-Star Game already simulated' });
    }

    const result = await simulateAllStarGame(seasonId);
    res.json(result);
  } catch (error) {
    console.error('All-Star Game simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate All-Star Game' });
  }
});

// Simulate all remaining events
router.post('/simulate/all', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const franchise = franchiseResult.rows[0];
    const seasonId = franchise.season_id;

    // Check if All-Stars are selected, if not select them
    const selectionsResult = await pool.query(
      `SELECT COUNT(*) FROM all_star_selections WHERE season_id = $1`,
      [seasonId]
    );

    if (parseInt(selectionsResult.rows[0].count) === 0) {
      await selectAllStars(seasonId, 'Eastern');
      await selectAllStars(seasonId, 'Western');
    }

    const results: any[] = [];

    // Get existing events
    const existingEvents = await getEventResults(seasonId);
    const completedTypes = existingEvents.map(e => e.event_type);

    // Simulate missing events in order
    if (!completedTypes.includes('rising_stars')) {
      results.push(await simulateRisingStars(seasonId));
    }
    if (!completedTypes.includes('skills')) {
      results.push(await simulateSkillsChallenge(seasonId));
    }
    if (!completedTypes.includes('three_point')) {
      results.push(await simulateThreePointContest(seasonId));
    }
    if (!completedTypes.includes('dunk')) {
      results.push(await simulateDunkContest(seasonId));
    }
    if (!completedTypes.includes('game')) {
      results.push(await simulateAllStarGame(seasonId));
    }

    // Mark All-Star weekend complete
    await pool.query(
      `UPDATE franchises SET all_star_complete = TRUE WHERE id = $1`,
      [franchise.id]
    );

    res.json({
      message: 'All-Star Weekend complete!',
      events_simulated: results.length,
      results
    });
  } catch (error) {
    console.error('Simulate all error:', error);
    res.status(500).json({ error: 'Failed to simulate All-Star Weekend' });
  }
});

// Get event results
router.get('/results', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchiseResult.rows[0].season_id;
    const results = await getEventResults(seasonId);

    res.json({ events: results });
  } catch (error) {
    console.error('Event results error:', error);
    res.status(500).json({ error: 'Failed to get event results' });
  }
});

// Complete All-Star Weekend and return to regular season
router.post('/complete', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const franchise = franchiseResult.rows[0];

    // Verify All-Star Game is complete
    const gameResult = await pool.query(
      `SELECT * FROM all_star_events WHERE season_id = $1 AND event_type = 'game'`,
      [franchise.season_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(400).json({ error: 'Must complete All-Star Game first' });
    }

    // Return to regular season, advance day past All-Star break
    await pool.query(
      `UPDATE franchises
       SET phase = 'regular_season',
           all_star_complete = TRUE,
           current_day = GREATEST(current_day, 89)
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
