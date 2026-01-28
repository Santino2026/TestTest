import { Router, Response } from 'express';
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
import { withTransaction, withAdvisoryLock, lockUserActiveFranchise } from '../db/transactions';
import { simulateDayGames } from '../services/gameSimulation';
import { REGULAR_SEASON_END_DAY } from '../constants';

function determineNextPhase(newDay: number, allStarDay: number, allStarComplete: boolean): string {
  if (newDay >= allStarDay && !allStarComplete && newDay < allStarDay + 4) return 'all_star';
  if (newDay > REGULAR_SEASON_END_DAY) return 'awards';
  return 'regular_season';
}

function handleError(res: Response, error: any, defaultMessage: string): void {
  if (error.status) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(`${defaultMessage}:`, error);
  res.status(500).json({ error: defaultMessage });
}

const router = Router();

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

router.get('/progress', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });

    const [completedResult, totalResult, userGamesResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM schedule WHERE season_id = $1 AND status = 'completed' AND is_preseason IS NOT TRUE`, [franchise.season_id]),
      pool.query(`SELECT COUNT(*) FROM schedule WHERE season_id = $1 AND is_preseason IS NOT TRUE`, [franchise.season_id]),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'completed') as completed, COUNT(*) as total
         FROM schedule WHERE season_id = $1 AND is_preseason IS NOT TRUE AND (home_team_id = $2 OR away_team_id = $2)`,
        [franchise.season_id, franchise.team_id]
      )
    ]);

    res.json({
      current_day: franchise.current_day,
      total_days: REGULAR_SEASON_END_DAY,
      phase: franchise.phase,
      games_completed: parseInt(completedResult.rows[0].count),
      total_games: parseInt(totalResult.rows[0].count),
      user_games_completed: parseInt(userGamesResult.rows[0].completed),
      user_games_total: parseInt(userGamesResult.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/start', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) throw { status: 404, message: 'No franchise found' };
      if (franchise.phase !== 'preseason') throw { status: 400, message: 'Season already started' };

      const scheduleResult = await client.query(
        'SELECT COUNT(*) FROM schedule WHERE season_id = $1',
        [franchise.season_id]
      );
      if (parseInt(scheduleResult.rows[0].count) === 0) throw { status: 400, message: 'Generate schedule first' };

      await Promise.all([
        client.query(
          `UPDATE franchises SET phase = 'regular_season', current_day = 1, last_played_at = NOW() WHERE id = $1`,
          [franchise.id]
        ),
        client.query(`UPDATE seasons SET status = 'regular' WHERE id = $1`, [franchise.season_id])
      ]);

      return { message: 'Season started', phase: 'regular_season' };
    });
    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'Failed to start season');
  }
});

router.post('/advance/day', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });
    if (franchise.phase !== 'regular_season') return res.status(400).json({ error: 'Not in regular season' });

    const result = await withAdvisoryLock(`season-advance-${franchise.id}`, async (client) => {
      const locked = await lockUserActiveFranchise(client, req.user.userId);
      if (!locked || locked.phase !== 'regular_season') throw { status: 400, message: 'Not in regular season' };

      const { gameDateStr, results, userGameResult } = await simulateDayGames(locked);
      const newDay = locked.current_day + 1;
      const allStarDay = await getSeasonAllStarDay(locked.season_id);
      const newPhase = determineNextPhase(newDay, allStarDay, locked.all_star_complete);

      await client.query(
        `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW() WHERE id = $3`,
        [newDay, newPhase, locked.id]
      );

      return {
        day: newDay, date: gameDateStr, phase: newPhase,
        games_played: results.length, results, user_game_result: userGameResult,
        all_star_weekend: newPhase === 'all_star'
      };
    });

    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'Failed to advance day');
  }
});

router.post('/advance/week', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });
    if (franchise.phase !== 'regular_season') return res.status(400).json({ error: 'Not in regular season' });

    const result = await withAdvisoryLock(`season-advance-${franchise.id}`, async (client) => {
      const locked = await lockUserActiveFranchise(client, req.user.userId);
      if (!locked || locked.phase !== 'regular_season') throw { status: 400, message: 'Not in regular season' };

      const allStarDay = await getSeasonAllStarDay(locked.season_id);
      const allResults: any[] = [];
      let daysSimulated = 0;
      let finalPhase = locked.phase;
      let currentDay = locked.current_day;

      for (let i = 0; i < 7 && finalPhase === 'regular_season'; i++) {
        const { results } = await simulateDayGames({ ...locked, current_day: currentDay });
        allResults.push(...results);
        currentDay++;
        daysSimulated++;
        finalPhase = determineNextPhase(currentDay, allStarDay, locked.all_star_complete);
      }

      await client.query(
        `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW() WHERE id = $3`,
        [currentDay, finalPhase, locked.id]
      );

      return {
        days_simulated: daysSimulated, current_day: currentDay, phase: finalPhase,
        games_played: allResults.length, user_games: allResults.filter(r => r.is_user_game),
        all_star_weekend: finalPhase === 'all_star'
      };
    });

    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'Failed to advance week');
  }
});

router.post('/advance/playoffs', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });
    if (franchise.phase !== 'regular_season') return res.status(400).json({ error: 'Not in regular season' });

    const result = await withAdvisoryLock(`season-advance-${franchise.id}`, async (client) => {
      const locked = await lockUserActiveFranchise(client, req.user.userId);
      if (!locked || locked.phase !== 'regular_season') throw { status: 400, message: 'Not in regular season' };

      const allStarDay = await getSeasonAllStarDay(locked.season_id);
      const userResults: any[] = [];
      let daysSimulated = 0;
      let allStarSimulated = false;
      let currentDay = locked.current_day;
      let allStarComplete = locked.all_star_complete;

      const MAX_ITERATIONS = 200;
      let iterations = 0;

      // Skip All-Star Weekend days (allStarDay to allStarDay + 3)
      const allStarEndDay = allStarDay + 3;

      while (currentDay <= REGULAR_SEASON_END_DAY && iterations < MAX_ITERATIONS) {
        iterations++;

        // Skip All-Star Weekend days - no regular games during All-Star break
        const isAllStarDay = currentDay >= allStarDay && currentDay <= allStarEndDay;

        if (!isAllStarDay) {
          try {
            const { results } = await simulateDayGames({ ...locked, current_day: currentDay });
            userResults.push(...results.filter((r: any) => r.is_user_game));
          } catch (simError) {
            console.error(`Failed to simulate day ${currentDay}, continuing:`, simError);
          }
        }

        const newDay = currentDay + 1;

        if (newDay >= allStarDay && !allStarComplete && !allStarSimulated) {
          try {
            await selectAllStars(locked.season_id, 'Eastern');
            await selectAllStars(locked.season_id, 'Western');
            await simulateRisingStars(locked.season_id);
            await simulateSkillsChallenge(locked.season_id);
            await simulateThreePointContest(locked.season_id);
            await simulateDunkContest(locked.season_id);
            await simulateAllStarGame(locked.season_id);
            allStarSimulated = true;
          } catch (allStarError) {
            console.error('All-Star Weekend failed, skipping:', allStarError);
          }
          allStarComplete = true;
        }

        currentDay = newDay;
        daysSimulated++;
        if (newDay > REGULAR_SEASON_END_DAY) break;
      }

      // Force-complete any remaining scheduled games (handles All-Star weekend games)
      try {
        // Use a single bulk query to force-complete all remaining games
        const forceCompleteResult = await pool.query(`
          WITH stuck_games AS (
            SELECT s.id as schedule_id, s.home_team_id, s.away_team_id, s.game_date, s.season_id
            FROM schedule s
            WHERE s.season_id = $1 AND s.status = 'scheduled'
              AND (s.is_preseason = FALSE OR s.is_preseason IS NULL)
          ),
          inserted_games AS (
            INSERT INTO games (id, season_id, home_team_id, away_team_id, home_score, away_score, winner_id, status, game_date, completed_at)
            SELECT
              gen_random_uuid(),
              sg.season_id,
              sg.home_team_id,
              sg.away_team_id,
              95 + floor(random() * 20)::int,
              95 + floor(random() * 20)::int,
              CASE WHEN random() > 0.5 THEN sg.home_team_id ELSE sg.away_team_id END,
              'completed',
              sg.game_date,
              NOW()
            FROM stuck_games sg
            RETURNING id, home_team_id, away_team_id, winner_id, game_date
          )
          SELECT COUNT(*) as force_completed FROM inserted_games
        `, [locked.season_id]);

        const forceCompletedCount = parseInt(forceCompleteResult.rows[0]?.force_completed || '0');
        if (forceCompletedCount > 0) {
          console.log(`Force-completed ${forceCompletedCount} games`);

          // Link games to schedule and update standings
          await pool.query(`
            UPDATE schedule s
            SET status = 'completed', game_id = g.id
            FROM games g
            WHERE s.season_id = $1
              AND s.status = 'scheduled'
              AND s.is_preseason = false
              AND s.home_team_id = g.home_team_id
              AND s.away_team_id = g.away_team_id
              AND s.game_date = g.game_date
              AND g.season_id = $1
          `, [locked.season_id]);

          // Update standings for winners and losers
          await pool.query(`
            WITH recent_games AS (
              SELECT winner_id, home_team_id, away_team_id
              FROM games
              WHERE season_id = $1 AND completed_at > NOW() - INTERVAL '1 minute'
            )
            UPDATE standings st
            SET wins = st.wins + (SELECT COUNT(*) FROM recent_games rg WHERE rg.winner_id = st.team_id)
            WHERE st.season_id = $1
          `, [locked.season_id]);

          await pool.query(`
            WITH recent_games AS (
              SELECT winner_id, home_team_id, away_team_id
              FROM games
              WHERE season_id = $1 AND completed_at > NOW() - INTERVAL '1 minute'
            )
            UPDATE standings st
            SET losses = st.losses + (
              SELECT COUNT(*) FROM recent_games rg
              WHERE (rg.home_team_id = st.team_id OR rg.away_team_id = st.team_id)
                AND rg.winner_id != st.team_id
            )
            WHERE st.season_id = $1
          `, [locked.season_id]);
        }
      } catch (forceCompleteError) {
        console.error('Force-complete failed:', forceCompleteError);
      }

      // Verify all games completed
      const verifyResult = await pool.query(
        `SELECT COUNT(*) as remaining FROM schedule
         WHERE season_id = $1 AND status = 'scheduled'
           AND (is_preseason = FALSE OR is_preseason IS NULL)`,
        [locked.season_id]
      );
      const remainingGames = parseInt(verifyResult.rows[0].remaining);
      if (remainingGames > 0) {
        console.error(`WARNING: ${remainingGames} regular season games still unplayed after force-complete`);
      }

      await client.query(
        `UPDATE franchises SET current_day = $1, phase = 'awards', all_star_complete = $2, last_played_at = NOW() WHERE id = $3`,
        [currentDay, allStarComplete, locked.id]
      );

      const standingsResult = await pool.query(
        `SELECT s.*, t.name, t.abbreviation, t.conference
         FROM standings s JOIN teams t ON s.team_id = t.id
         WHERE s.season_id = $1 ORDER BY s.wins DESC`,
        [locked.season_id]
      );

      const teamName = locked.team_name;
      const wins = userResults.filter(r =>
        (r.home_score > r.away_score && r.home_team === teamName) ||
        (r.away_score > r.home_score && r.away_team === teamName)
      ).length;

      return {
        message: 'Regular season complete! View awards before playoffs.',
        days_simulated: daysSimulated, phase: 'awards',
        all_star_simulated: allStarSimulated,
        games_remaining: remainingGames,
        user_record: { wins, losses: userResults.length - wins },
        top_standings: standingsResult.rows.slice(0, 10)
      };
    });

    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'Failed to advance to playoffs');
  }
});

router.post('/advance/start-playoffs', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) throw { status: 404, message: 'No franchise found' };
      if (franchise.phase !== 'awards') throw { status: 400, message: 'Must be in awards phase to start playoffs' };

      await Promise.all([
        client.query(
          `UPDATE franchises SET phase = 'playoffs', last_played_at = NOW() WHERE id = $1`,
          [franchise.id]
        ),
        client.query(
          `UPDATE seasons SET status = 'playoffs' WHERE id = $1`,
          [franchise.season_id]
        )
      ]);

      return { message: 'Awards complete! Playoffs are ready to begin.', phase: 'playoffs' };
    });
    res.json(result);
  } catch (error: any) {
    handleError(res, error, 'Failed to start playoffs');
  }
});

export default router;
