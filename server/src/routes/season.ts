// Season routes - handles core season operations (current season, progress, day/week advancement)
import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';
import {
  selectAllStars,
  simulateRisingStars,
  simulateSkillsChallenge,
  simulateThreePointContest,
  simulateDunkContest,
  simulateAllStarGame
} from '../allstar';
import { getUserActiveFranchise, getSeasonAllStarDay } from '../db/queries';
import { withTransaction, lockUserActiveFranchise } from '../db/transactions';
import { simulateDayGames } from '../services/gameSimulation';
import { REGULAR_SEASON_END_DAY } from '../constants';

// Determine the next phase based on current day and All-Star completion
function determineNextPhase(
  newDay: number,
  allStarDay: number,
  allStarComplete: boolean
): string {
  if (newDay >= allStarDay && !allStarComplete && newDay < allStarDay + 4) {
    return 'all_star';
  }
  if (newDay > REGULAR_SEASON_END_DAY) {
    return 'awards';
  }
  return 'regular_season';
}

const router = Router();

// Get current season
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM seasons WHERE status != 'completed' ORDER BY season_number DESC LIMIT 1`
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

// Get season progress for user's franchise
router.get('/progress', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    // Count completed games
    const completedResult = await pool.query(
      `SELECT COUNT(*) FROM schedule WHERE season_id = $1 AND status = 'completed'`,
      [franchise.season_id]
    );
    const gamesCompleted = parseInt(completedResult.rows[0].count);

    // Count total games
    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM schedule WHERE season_id = $1`,
      [franchise.season_id]
    );
    const totalGames = parseInt(totalResult.rows[0].count);

    // Count user's team games
    const userGamesResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) as total
       FROM schedule
       WHERE season_id = $1 AND (home_team_id = $2 OR away_team_id = $2)`,
      [franchise.season_id, franchise.team_id]
    );
    const userGamesCompleted = parseInt(userGamesResult.rows[0].completed);
    const userGamesTotal = parseInt(userGamesResult.rows[0].total);

    res.json({
      current_day: franchise.current_day,
      total_days: REGULAR_SEASON_END_DAY,
      phase: franchise.phase,
      games_completed: gamesCompleted,
      total_games: totalGames,
      user_games_completed: userGamesCompleted,
      user_games_total: userGamesTotal
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Start season (set phase to regular_season)
router.post('/start', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await withTransaction(async (client) => {
      // Lock franchise to prevent concurrent start
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      // Check if already started
      if (franchise.phase !== 'preseason') {
        throw { status: 400, message: 'Season already started' };
      }

      // Check if schedule exists
      const scheduleResult = await client.query(
        'SELECT COUNT(*) FROM schedule WHERE season_id = $1',
        [franchise.season_id]
      );

      if (parseInt(scheduleResult.rows[0].count) === 0) {
        throw { status: 400, message: 'Generate schedule first' };
      }

      // Update phase
      await client.query(
        `UPDATE franchises SET phase = 'regular_season', current_day = 1, last_played_at = NOW()
         WHERE id = $1`,
        [franchise.id]
      );

      // Update season status
      await client.query(
        `UPDATE seasons SET status = 'regular' WHERE id = $1`,
        [franchise.season_id]
      );

      return { message: 'Season started', phase: 'regular_season' };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to start season' });
  }
});

// Advance one day in the season
router.post('/advance/day', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    if (franchise.phase !== 'regular_season') {
      return res.status(400).json({ error: 'Not in regular season' });
    }

    // Simulate games outside transaction (slow part)
    const { gameDateStr, results, userGameResult } = await simulateDayGames(franchise);

    // Determine next phase
    const newDay = franchise.current_day + 1;
    const allStarDay = await getSeasonAllStarDay(franchise.season_id);
    const newPhase = determineNextPhase(newDay, allStarDay, franchise.all_star_complete);

    await pool.query(
      `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW()
       WHERE id = $3`,
      [newDay, newPhase, franchise.id]
    );

    res.json({
      day: newDay,
      date: gameDateStr,
      phase: newPhase,
      games_played: results.length,
      results,
      user_game_result: userGameResult,
      all_star_weekend: newPhase === 'all_star'
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Advance day error:', error);
    res.status(500).json({ error: 'Failed to advance day' });
  }
});

// Advance one week (7 days)
router.post('/advance/week', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    if (franchise.phase !== 'regular_season') {
      return res.status(400).json({ error: 'Not in regular season' });
    }

    const allStarDay = await getSeasonAllStarDay(franchise.season_id);

    // Simulate games outside transaction
    const allResults: any[] = [];
    let daysSimulated = 0;
    let finalPhase = franchise.phase;
    let currentDay = franchise.current_day;

    for (let i = 0; i < 7; i++) {
      if (finalPhase !== 'regular_season') break;

      const { results } = await simulateDayGames({ ...franchise, current_day: currentDay });
      allResults.push(...results);

      currentDay = currentDay + 1;
      daysSimulated++;
      finalPhase = determineNextPhase(currentDay, allStarDay, franchise.all_star_complete);
    }

    await pool.query(
      `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW()
       WHERE id = $3`,
      [currentDay, finalPhase, franchise.id]
    );

    res.json({
      days_simulated: daysSimulated,
      current_day: currentDay,
      phase: finalPhase,
      games_played: allResults.length,
      user_games: allResults.filter(r => r.is_user_game),
      all_star_weekend: finalPhase === 'all_star'
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Advance week error:', error);
    res.status(500).json({ error: 'Failed to advance week' });
  }
});

// Simulate to end of regular season (playoffs)
router.post('/advance/playoffs', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    if (franchise.phase !== 'regular_season') {
      return res.status(400).json({ error: 'Not in regular season' });
    }

    const allStarDay = await getSeasonAllStarDay(franchise.season_id);

    const userResults: any[] = [];
    let daysSimulated = 0;
    let allStarSimulated = false;
    let currentDay = franchise.current_day;
    let allStarComplete = franchise.all_star_complete;

    // Simulate until playoffs (game simulation outside transaction for performance)
    while (currentDay <= REGULAR_SEASON_END_DAY) {
      const { results } = await simulateDayGames({ ...franchise, current_day: currentDay });

      // Track user's games
      for (const r of results) {
        if (r.is_user_game) {
          userResults.push(r);
        }
      }

      const newDay = currentDay + 1;

      // Auto-simulate All-Star Weekend if needed
      if (newDay >= allStarDay && !allStarComplete && !allStarSimulated) {
        try {
          // Select All-Stars
          await selectAllStars(franchise.season_id, 'Eastern');
          await selectAllStars(franchise.season_id, 'Western');

          // Simulate all events
          await simulateRisingStars(franchise.season_id);
          await simulateSkillsChallenge(franchise.season_id);
          await simulateThreePointContest(franchise.season_id);
          await simulateDunkContest(franchise.season_id);
          await simulateAllStarGame(franchise.season_id);

          allStarSimulated = true;
        } catch (allStarError) {
          // All-Star failed but we can continue the season
          console.error('All-Star Weekend failed, skipping:', allStarError);
        }

        allStarComplete = true;
      }

      currentDay = newDay;
      daysSimulated++;

      if (newDay > REGULAR_SEASON_END_DAY) break;
    }

    // Final update - simple query, no transaction needed
    await pool.query(
      `UPDATE franchises SET current_day = $1, phase = 'awards', all_star_complete = $2, last_played_at = NOW()
       WHERE id = $3`,
      [currentDay, allStarComplete, franchise.id]
    );

    // Get final standings
    const standingsResult = await pool.query(
      `SELECT s.*, t.name, t.abbreviation, t.conference
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
       ORDER BY s.wins DESC`,
      [franchise.season_id]
    );

    const finalResult = standingsResult.rows;

    res.json({
      message: 'Regular season complete! View awards before playoffs.',
      days_simulated: daysSimulated,
      phase: 'awards',
      all_star_simulated: allStarSimulated,
      user_record: {
        wins: userResults.filter(r =>
          (r.home_score > r.away_score && r.home_team === franchise?.team_name) ||
          (r.away_score > r.home_score && r.away_team === franchise?.team_name)
        ).length,
        losses: userResults.filter(r =>
          (r.home_score < r.away_score && r.home_team === franchise?.team_name) ||
          (r.away_score < r.home_score && r.away_team === franchise?.team_name)
        ).length
      },
      top_standings: finalResult.slice(0, 10)
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Advance to playoffs error:', error);
    res.status(500).json({
      error: 'Failed to advance to playoffs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Advance from awards phase to playoffs
router.post('/advance/start-playoffs', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await withTransaction(async (client) => {
      // Lock franchise to prevent concurrent phase change
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      if (franchise.phase !== 'awards') {
        throw { status: 400, message: 'Must be in awards phase to start playoffs' };
      }

      // Update franchise to playoffs phase
      await client.query(
        `UPDATE franchises SET phase = 'playoffs', last_played_at = NOW() WHERE id = $1`,
        [franchise.id]
      );

      return {
        message: 'Awards complete! Playoffs are ready to begin.',
        phase: 'playoffs'
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Start playoffs error:', error);
    res.status(500).json({ error: 'Failed to start playoffs' });
  }
});

export default router;
