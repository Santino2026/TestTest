import { Router } from 'express';
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { developPlayer, agePlayer, shouldRetire, DevelopmentResult } from '../development';
import { authMiddleware } from '../auth';
import { generateSchedule, generatePreseasonSchedule } from '../schedule/generator';
import {
  selectAllStars,
  simulateRisingStars,
  simulateSkillsChallenge,
  simulateThreePointContest,
  simulateDunkContest,
  simulateAllStarGame
} from '../allstar';
import {
  getUserActiveFranchise,
  updateFranchiseState,
  updateSeasonStatus,
  getSeasonAllStarDay,
  getAllTeams
} from '../db/queries';
import { withTransaction, withAdvisoryLock, lockUserActiveFranchise } from '../db/transactions';
import { saveCompleteGameResult, GameResult } from '../services/gamePersistence';

const router = Router();

// Helper to simulate a single day's games (regular season)
async function simulateDayGames(franchise: any) {
  const seasonId = franchise.season_id;
  const currentDay = franchise.current_day;

  // Calculate the game date for this day
  const seasonStart = new Date('2024-10-22');
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + currentDay);
  const gameDateStr = gameDate.toISOString().split('T')[0];

  // Get all regular season games scheduled for this day
  const gamesResult = await pool.query(
    `SELECT s.*,
            ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_date = $2 AND s.status = 'scheduled' AND s.is_preseason = FALSE`,
    [seasonId, gameDateStr]
  );

  const results = [];

  for (const scheduledGame of gamesResult.rows) {
    const isUserGame = scheduledGame.home_team_id === franchise.team_id ||
                       scheduledGame.away_team_id === franchise.team_id;

    // Simulate the game
    const homeTeam = await loadTeamForSimulation(scheduledGame.home_team_id);
    const awayTeam = await loadTeamForSimulation(scheduledGame.away_team_id);
    const simResult = simulateGame(homeTeam, awayTeam);

    // Convert to GameResult format
    const gameResult: GameResult = {
      id: simResult.id,
      home_team_id: simResult.home_team_id,
      away_team_id: simResult.away_team_id,
      home_score: simResult.home_score,
      away_score: simResult.away_score,
      winner_id: simResult.winner_id,
      is_overtime: simResult.is_overtime,
      overtime_periods: simResult.overtime_periods,
      quarters: simResult.quarters,
      home_stats: simResult.home_stats,
      away_stats: simResult.away_stats,
      home_player_stats: simResult.home_player_stats.map((ps: any) => ({
        ...ps,
        player_id: ps.player_id
      })),
      away_player_stats: simResult.away_player_stats.map((ps: any) => ({
        ...ps,
        player_id: ps.player_id
      }))
    };

    // Save complete game result with standings and advanced stats
    await saveCompleteGameResult(
      gameResult,
      seasonId,
      { id: homeTeam.id, starters: homeTeam.starters },
      { id: awayTeam.id, starters: awayTeam.starters },
      true // Update standings for regular season
    );

    // Update schedule entry
    await pool.query(
      `UPDATE schedule SET status = 'completed', game_id = $1, is_user_game = $2
       WHERE id = $3`,
      [simResult.id, isUserGame, scheduledGame.id]
    );

    results.push({
      game_id: simResult.id,
      home_team: scheduledGame.home_team_name,
      away_team: scheduledGame.away_team_name,
      home_score: simResult.home_score,
      away_score: simResult.away_score,
      is_user_game: isUserGame
    });
  }

  return { gameDateStr, results };
}

// Helper to simulate preseason games (no standings updates)
async function simulatePreseasonDayGames(franchise: any) {
  const seasonId = franchise.season_id;
  const currentDay = franchise.current_day; // -7 to 0 for preseason

  // Calculate the game date for this day
  const seasonStart = new Date('2024-10-22');
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + currentDay);
  const gameDateStr = gameDate.toISOString().split('T')[0];

  // Get all preseason games scheduled for this day
  const gamesResult = await pool.query(
    `SELECT s.*,
            ht.name as home_team_name, at.name as away_team_name
     FROM schedule s
     JOIN teams ht ON s.home_team_id = ht.id
     JOIN teams at ON s.away_team_id = at.id
     WHERE s.season_id = $1 AND s.game_date = $2 AND s.status = 'scheduled' AND s.is_preseason = TRUE`,
    [seasonId, gameDateStr]
  );

  const results = [];

  for (const scheduledGame of gamesResult.rows) {
    const isUserGame = scheduledGame.home_team_id === franchise.team_id ||
                       scheduledGame.away_team_id === franchise.team_id;

    // Simulate the game
    const homeTeam = await loadTeamForSimulation(scheduledGame.home_team_id);
    const awayTeam = await loadTeamForSimulation(scheduledGame.away_team_id);
    const simResult = simulateGame(homeTeam, awayTeam);

    // Convert to GameResult format
    const gameResult: GameResult = {
      id: simResult.id,
      home_team_id: simResult.home_team_id,
      away_team_id: simResult.away_team_id,
      home_score: simResult.home_score,
      away_score: simResult.away_score,
      winner_id: simResult.winner_id,
      is_overtime: simResult.is_overtime,
      overtime_periods: simResult.overtime_periods,
      quarters: simResult.quarters,
      home_stats: simResult.home_stats,
      away_stats: simResult.away_stats,
      home_player_stats: simResult.home_player_stats.map((ps: any) => ({
        ...ps,
        player_id: ps.player_id
      })),
      away_player_stats: simResult.away_player_stats.map((ps: any) => ({
        ...ps,
        player_id: ps.player_id
      }))
    };

    // Save complete game result WITHOUT standings (preseason)
    await saveCompleteGameResult(
      gameResult,
      seasonId,
      { id: homeTeam.id, starters: homeTeam.starters },
      { id: awayTeam.id, starters: awayTeam.starters },
      false // Don't update standings for preseason
    );

    // Update schedule entry
    await pool.query(
      `UPDATE schedule SET status = 'completed', game_id = $1, is_user_game = $2
       WHERE id = $3`,
      [simResult.id, isUserGame, scheduledGame.id]
    );

    results.push({
      game_id: simResult.id,
      home_team: scheduledGame.home_team_name,
      away_team: scheduledGame.away_team_name,
      home_score: simResult.home_score,
      away_score: simResult.away_score,
      is_user_game: isUserGame,
      is_preseason: true
    });
  }

  return { gameDateStr, results };
}

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
      total_days: 174,
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

// Advance one day in preseason
router.post('/advance/preseason', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await withTransaction(async (client) => {
      // Lock franchise to prevent concurrent advancement
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      if (franchise.phase !== 'preseason') {
        throw { status: 400, message: 'Not in preseason' };
      }

      // Simulate games (outside transaction for performance, but safe since games are idempotent)
      const { gameDateStr, results } = await simulatePreseasonDayGames(franchise);

      // Advance the day
      const newDay = franchise.current_day + 1;
      let newPhase = franchise.phase;

      // Check if preseason is complete (after day 0)
      if (newDay > 0) {
        newPhase = 'regular_season';
        // Update season status
        await client.query(
          `UPDATE seasons SET status = 'regular' WHERE id = $1`,
          [franchise.season_id]
        );
      }

      await client.query(
        `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW()
         WHERE id = $3`,
        [newPhase === 'regular_season' ? 1 : newDay, newPhase, franchise.id]
      );

      return {
        day: newDay,
        date: gameDateStr,
        phase: newPhase,
        games_played: results.length,
        results,
        preseason_complete: newPhase === 'regular_season'
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Advance preseason day error:', error);
    res.status(500).json({ error: 'Failed to advance preseason day' });
  }
});

// Simulate entire preseason
router.post('/advance/preseason/all', authMiddleware(true), async (req: any, res) => {
  try {
    // First, lock and validate in a transaction
    const initialFranchise = await withTransaction(async (client) => {
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      if (franchise.phase !== 'preseason') {
        throw { status: 400, message: 'Not in preseason' };
      }

      return franchise;
    });

    const allResults: any[] = [];
    let daysSimulated = 0;
    let currentDay = initialFranchise.current_day;

    // Simulate until preseason is complete (game simulation outside transaction for performance)
    while (currentDay <= 0) {
      const { results } = await simulatePreseasonDayGames({ ...initialFranchise, current_day: currentDay });
      allResults.push(...results);

      currentDay++;
      daysSimulated++;

      if (currentDay > 0) break;
    }

    // Final update in transaction with lock
    const result = await withTransaction(async (client) => {
      // Re-lock to ensure no concurrent changes
      await lockUserActiveFranchise(client, req.user.userId);

      // Update season status
      await client.query(
        `UPDATE seasons SET status = 'regular' WHERE id = $1`,
        [initialFranchise.season_id]
      );

      // Update franchise to regular season
      await client.query(
        `UPDATE franchises SET current_day = 1, phase = 'regular_season', last_played_at = NOW()
         WHERE id = $1`,
        [initialFranchise.id]
      );

      return {
        message: 'Preseason complete!',
        days_simulated: daysSimulated,
        phase: 'regular_season',
        current_day: 1,
        games_played: allResults.length,
        user_games: allResults.filter(r => r.is_user_game)
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Simulate all preseason error:', error);
    res.status(500).json({ error: 'Failed to simulate preseason' });
  }
});

// Advance one day in the season
router.post('/advance/day', authMiddleware(true), async (req: any, res) => {
  try {
    // Use advisory lock to serialize all advancement requests for this user
    const result = await withAdvisoryLock(`advance-season-${req.user.userId}`, async (client) => {
      // Lock franchise to prevent concurrent advancement
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      if (franchise.phase !== 'regular_season') {
        throw { status: 400, message: 'Not in regular season' };
      }

      // Simulate games (safe within advisory lock since concurrent requests are serialized)
      const { gameDateStr, results } = await simulateDayGames(franchise);

      // Advance the day
      const newDay = franchise.current_day + 1;
      let newPhase = franchise.phase;

      // Get All-Star day from season settings
      const allStarDay = await getSeasonAllStarDay(franchise.season_id, client);

      // Check if it's All-Star Weekend (and not already completed)
      if (newDay >= allStarDay && !franchise.all_star_complete && newDay < allStarDay + 4) {
        newPhase = 'all_star';
      }
      // Check if season is complete (after ~174 days) - go to awards first
      else if (newDay > 174) {
        newPhase = 'awards';
      }

      await client.query(
        `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW()
         WHERE id = $3`,
        [newDay, newPhase, franchise.id]
      );

      return {
        day: newDay,
        date: gameDateStr,
        phase: newPhase,
        games_played: results.length,
        results,
        all_star_weekend: newPhase === 'all_star'
      };
    });

    res.json(result);
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
    // Use advisory lock to serialize all advancement requests for this user
    const result = await withAdvisoryLock(`advance-season-${req.user.userId}`, async (client) => {
      // Lock franchise to prevent concurrent advancement
      let franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      if (franchise.phase !== 'regular_season') {
        throw { status: 400, message: 'Not in regular season' };
      }

      // Get All-Star day from season settings
      const allStarDay = await getSeasonAllStarDay(franchise.season_id, client);

      const allResults: any[] = [];
      let daysSimulated = 0;
      let finalPhase = franchise.phase;
      let currentDay = franchise.current_day;

      for (let i = 0; i < 7; i++) {
        if (finalPhase !== 'regular_season') break;

        // Simulate games for current day
        const { results } = await simulateDayGames({ ...franchise, current_day: currentDay });
        allResults.push(...results);

        const newDay = currentDay + 1;
        let newPhase: string = 'regular_season';

        // Check for All-Star Weekend
        if (newDay >= allStarDay && !franchise.all_star_complete && newDay < allStarDay + 4) {
          newPhase = 'all_star';
        }
        // Check if season is complete - go to awards first
        else if (newDay > 174) {
          newPhase = 'awards';
        }

        currentDay = newDay;
        daysSimulated++;
        finalPhase = newPhase;
      }

      // Update franchise with final state
      await client.query(
        `UPDATE franchises SET current_day = $1, phase = $2, last_played_at = NOW()
         WHERE id = $3`,
        [currentDay, finalPhase, franchise.id]
      );

      return {
        days_simulated: daysSimulated,
        current_day: currentDay,
        phase: finalPhase,
        games_played: allResults.length,
        user_games: allResults.filter(r => r.is_user_game),
        all_star_weekend: finalPhase === 'all_star'
      };
    });

    res.json(result);
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
    // First, lock and validate in a transaction
    const initialData = await withTransaction(async (client) => {
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      if (franchise.phase !== 'regular_season') {
        throw { status: 400, message: 'Not in regular season' };
      }

      // Get All-Star day from season settings
      const allStarDay = await getSeasonAllStarDay(franchise.season_id, client);

      return { franchise, allStarDay };
    });

    let franchise = initialData.franchise;
    const allStarDay = initialData.allStarDay;

    const userResults: any[] = [];
    let daysSimulated = 0;
    let allStarSimulated = false;
    let currentDay = franchise.current_day;
    let allStarComplete = franchise.all_star_complete;

    // Simulate until playoffs (game simulation outside transaction for performance)
    while (currentDay <= 174) {
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

      if (newDay > 174) break;
    }

    // Final update in transaction with lock
    const finalResult = await withTransaction(async (client) => {
      // Re-lock to ensure no concurrent changes
      await lockUserActiveFranchise(client, req.user.userId);

      // Update franchise to awards phase
      await client.query(
        `UPDATE franchises SET current_day = $1, phase = 'awards', all_star_complete = $2, last_played_at = NOW()
         WHERE id = $3`,
        [currentDay, allStarComplete, franchise.id]
      );

      // Get final standings
      const standingsResult = await client.query(
        `SELECT s.*, t.name, t.abbreviation, t.conference
         FROM standings s
         JOIN teams t ON s.team_id = t.id
         WHERE s.season_id = $1
         ORDER BY s.wins DESC`,
        [franchise.season_id]
      );

      return standingsResult.rows;
    });

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

// Process offseason (player development, aging, retirements)
router.post('/offseason', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    // Get all players with their attributes
    const playersResult = await pool.query(
      `SELECT p.*,
              pa.work_ethic, pa.basketball_iq, pa.speed, pa.acceleration, pa.vertical,
              pa.stamina, pa.strength, pa.lateral_quickness, pa.hustle,
              pa.inside_scoring, pa.close_shot, pa.mid_range, pa.three_point, pa.free_throw,
              pa.layup, pa.standing_dunk, pa.driving_dunk, pa.post_moves, pa.post_control,
              pa.ball_handling, pa.passing_accuracy, pa.passing_vision, pa.steal, pa.block,
              pa.shot_iq, pa.offensive_iq, pa.passing_iq, pa.defensive_iq,
              pa.help_defense_iq, pa.offensive_consistency, pa.defensive_consistency,
              pa.interior_defense, pa.perimeter_defense, pa.offensive_rebound, pa.defensive_rebound
       FROM players p
       LEFT JOIN player_attributes pa ON p.id = pa.player_id`
    );

    const developmentResults: DevelopmentResult[] = [];
    const retirements: any[] = [];
    const aged: any[] = [];

    for (const player of playersResult.rows) {
      // Build attributes object
      const attributes: Record<string, number> = {
        work_ethic: player.work_ethic || 60,
        basketball_iq: player.basketball_iq || 60,
        speed: player.speed || 60,
        acceleration: player.acceleration || 60,
        vertical: player.vertical || 60,
        stamina: player.stamina || 60,
        strength: player.strength || 60,
        lateral_quickness: player.lateral_quickness || 60,
        hustle: player.hustle || 60,
        inside_scoring: player.inside_scoring || 60,
        close_shot: player.close_shot || 60,
        mid_range: player.mid_range || 60,
        three_point: player.three_point || 60,
        free_throw: player.free_throw || 60,
        layup: player.layup || 60,
        standing_dunk: player.standing_dunk || 60,
        driving_dunk: player.driving_dunk || 60,
        post_moves: player.post_moves || 60,
        post_control: player.post_control || 60,
        ball_handling: player.ball_handling || 60,
        passing_accuracy: player.passing_accuracy || 60,
        passing_vision: player.passing_vision || 60,
        steal: player.steal || 60,
        block: player.block || 60,
        shot_iq: player.shot_iq || 60,
        offensive_iq: player.offensive_iq || 60,
        passing_iq: player.passing_iq || 60,
        defensive_iq: player.defensive_iq || 60,
        help_defense_iq: player.help_defense_iq || 60,
        offensive_consistency: player.offensive_consistency || 60,
        defensive_consistency: player.defensive_consistency || 60,
        interior_defense: player.interior_defense || 60,
        perimeter_defense: player.perimeter_defense || 60,
        offensive_rebound: player.offensive_rebound || 60,
        defensive_rebound: player.defensive_rebound || 60
      };

      // Check for retirement first
      if (shouldRetire(player.age, player.overall, player.years_pro || 0)) {
        retirements.push({
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          age: player.age,
          overall: player.overall,
          years_pro: player.years_pro || 0
        });

        // Mark player as retired (remove from team, set status)
        await pool.query(
          `UPDATE players SET team_id = NULL WHERE id = $1`,
          [player.id]
        );
        continue;
      }

      // Age the player
      const newAge = agePlayer(player.age);
      aged.push({
        player_id: player.id,
        previous_age: player.age,
        new_age: newAge
      });

      // Develop player
      const devResult = developPlayer({
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        age: newAge,
        overall: player.overall,
        potential: player.potential,
        peak_age: player.peak_age || 28,
        archetype: player.archetype,
        work_ethic: player.work_ethic || 60,
        coachability: player.coachability || 60,
        attributes
      });

      developmentResults.push(devResult);

      // Apply changes to database
      await pool.query(
        `UPDATE players SET age = $1, overall = $2, years_pro = COALESCE(years_pro, 0) + 1 WHERE id = $3`,
        [newAge, devResult.new_overall, player.id]
      );

      // Update individual attributes
      for (const [attr, change] of Object.entries(devResult.changes)) {
        if (change !== 0) {
          await pool.query(
            `UPDATE player_attributes SET ${attr} = GREATEST(30, LEAST(99, COALESCE(${attr}, 60) + $1)) WHERE player_id = $2`,
            [change, player.id]
          );
        }
      }
    }

    // Update contracts (reduce years remaining)
    await pool.query(
      `UPDATE contracts SET years_remaining = years_remaining - 1, updated_at = NOW()
       WHERE status = 'active' AND years_remaining > 0`
    );

    // Expire contracts with 0 years remaining
    await pool.query(
      `UPDATE contracts SET status = 'expired', updated_at = NOW()
       WHERE status = 'active' AND years_remaining <= 0`
    );

    // Move players with expired contracts to free agency
    const expiredContracts = await pool.query(
      `SELECT c.player_id, c.annual_salary, p.overall, p.position
       FROM contracts c
       JOIN players p ON c.player_id = p.id
       WHERE c.status = 'expired' AND c.updated_at > NOW() - INTERVAL '1 minute'`
    );

    for (const row of expiredContracts.rows) {
      // Clear player's team
      await pool.query(
        `UPDATE players SET team_id = NULL, salary = 0 WHERE id = $1`,
        [row.player_id]
      );

      // Add to free_agents table for free agency phase
      await pool.query(
        `INSERT INTO free_agents (player_id, previous_team_id, asking_salary, market_value, status)
         VALUES ($1, (SELECT team_id FROM contracts WHERE player_id = $1 ORDER BY created_at DESC LIMIT 1), $2, $3, 'available')
         ON CONFLICT (player_id) DO UPDATE SET status = 'available', asking_salary = $2`,
        [row.player_id, row.annual_salary || 5000000, (row.overall || 70) * 100000]
      );
    }

    // Update franchise phase to offseason with initial phase
    await pool.query(
      `UPDATE franchises SET phase = 'offseason', offseason_phase = 'review', last_played_at = NOW() WHERE id = $1`,
      [franchise.id]
    );

    // Summary stats
    const improved = developmentResults.filter(r => r.new_overall > r.previous_overall).length;
    const declined = developmentResults.filter(r => r.new_overall < r.previous_overall).length;
    const unchanged = developmentResults.filter(r => r.new_overall === r.previous_overall).length;

    res.json({
      message: 'Offseason processed',
      summary: {
        total_players: developmentResults.length,
        improved,
        declined,
        unchanged,
        retirements: retirements.length,
        contracts_expired: expiredContracts.rows.length
      },
      top_improvers: developmentResults
        .filter(r => r.new_overall > r.previous_overall)
        .sort((a, b) => (b.new_overall - b.previous_overall) - (a.new_overall - a.previous_overall))
        .slice(0, 10),
      biggest_declines: developmentResults
        .filter(r => r.new_overall < r.previous_overall)
        .sort((a, b) => (a.new_overall - a.previous_overall) - (b.new_overall - b.previous_overall))
        .slice(0, 10),
      retirements
    });
  } catch (error) {
    console.error('Offseason error:', error);
    res.status(500).json({ error: 'Failed to process offseason' });
  }
});

// Finalize playoffs and transition to offseason
router.post('/finalize-playoffs', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    if (franchise.phase !== 'playoffs') {
      return res.status(400).json({ error: 'Not in playoffs phase' });
    }

    // Check if Finals are complete
    const finalsResult = await pool.query(
      `SELECT winner_id FROM playoff_series
       WHERE season_id = $1 AND round = 4 AND status = 'completed'`,
      [franchise.season_id]
    );

    if (finalsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Playoffs not complete yet' });
    }

    const champion = finalsResult.rows[0].winner_id;
    const userIsChampion = champion === franchise.team_id;

    // Update team championships if user won
    if (userIsChampion) {
      await pool.query(
        `UPDATE teams SET championships = championships + 1 WHERE id = $1`,
        [franchise.team_id]
      );
      await pool.query(
        `UPDATE franchises SET championships = championships + 1 WHERE id = $1`,
        [franchise.id]
      );
    }

    // Transition to offseason with 'review' sub-phase
    await pool.query(
      `UPDATE franchises SET phase = 'offseason', offseason_phase = 'review', last_played_at = NOW() WHERE id = $1`,
      [franchise.id]
    );

    // Update season status
    await pool.query(
      `UPDATE seasons SET status = 'offseason' WHERE id = $1`,
      [franchise.season_id]
    );

    res.json({
      message: 'Season complete!',
      champion_id: champion,
      user_is_champion: userIsChampion,
      phase: 'offseason',
      offseason_phase: 'review'
    });
  } catch (error) {
    console.error('Finalize playoffs error:', error);
    res.status(500).json({ error: 'Failed to finalize playoffs' });
  }
});

// Get season summary (for championship display)
router.get('/summary', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    // Get finals result
    const finalsResult = await pool.query(
      `SELECT ps.*,
              ht.name as higher_seed_name, ht.abbreviation as higher_abbrev, ht.city as higher_city,
              lt.name as lower_seed_name, lt.abbreviation as lower_abbrev, lt.city as lower_city,
              wt.name as winner_name, wt.abbreviation as winner_abbrev, wt.city as winner_city,
              wt.id as winner_id
       FROM playoff_series ps
       JOIN teams ht ON ps.higher_seed_id = ht.id
       JOIN teams lt ON ps.lower_seed_id = lt.id
       LEFT JOIN teams wt ON ps.winner_id = wt.id
       WHERE ps.season_id = $1 AND ps.round = 4`,
      [franchise.season_id]
    );

    const finals = finalsResult.rows[0] || null;
    const champion = finals?.winner_id ? {
      team_id: finals.winner_id,
      name: finals.winner_name,
      abbreviation: finals.winner_abbrev,
      city: finals.winner_city,
      series_score: finals.winner_id === finals.higher_seed_id
        ? `${finals.higher_seed_wins}-${finals.lower_seed_wins}`
        : `${finals.lower_seed_wins}-${finals.higher_seed_wins}`
    } : null;

    // Get user's team standings
    const userStandingsResult = await pool.query(
      `SELECT s.wins, s.losses, t.name, t.abbreviation, t.conference
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1 AND s.team_id = $2`,
      [franchise.season_id, franchise.team_id]
    );
    const userRecord = userStandingsResult.rows[0] || null;

    // Get user's playoff result
    const userPlayoffResult = await pool.query(
      `SELECT ps.round, ps.winner_id, ps.higher_seed_wins, ps.lower_seed_wins,
              ps.higher_seed_id, ps.lower_seed_id
       FROM playoff_series ps
       WHERE ps.season_id = $1
         AND (ps.higher_seed_id = $2 OR ps.lower_seed_id = $2)
       ORDER BY ps.round DESC
       LIMIT 1`,
      [franchise.season_id, franchise.team_id]
    );

    let userPlayoffFinish = 'Did not make playoffs';
    const userPlayoffSeries = userPlayoffResult.rows[0];

    if (userPlayoffSeries) {
      const userWon = userPlayoffSeries.winner_id === franchise.team_id;
      const roundNames: Record<number, string> = {
        0: 'Play-In Tournament',
        1: 'First Round',
        2: 'Conference Semifinals',
        3: 'Conference Finals',
        4: 'NBA Finals'
      };

      if (userWon && userPlayoffSeries.round === 4) {
        userPlayoffFinish = 'CHAMPIONS!';
      } else if (userWon) {
        userPlayoffFinish = `Won ${roundNames[userPlayoffSeries.round]}`;
      } else {
        userPlayoffFinish = `Lost in ${roundNames[userPlayoffSeries.round]}`;
      }
    }

    // Get top standings
    const topStandingsResult = await pool.query(
      `SELECT s.wins, s.losses, t.name, t.abbreviation, t.conference
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
       ORDER BY s.wins DESC
       LIMIT 8`,
      [franchise.season_id]
    );

    res.json({
      season_number: franchise.season_number || 1,
      champion,
      user_team: {
        name: userRecord?.name,
        abbreviation: userRecord?.abbreviation,
        wins: userRecord?.wins || 0,
        losses: userRecord?.losses || 0,
        playoff_finish: userPlayoffFinish,
        is_champion: champion?.team_id === franchise.team_id
      },
      top_standings: topStandingsResult.rows,
      playoffs_complete: !!champion
    });
  } catch (error) {
    console.error('Season summary error:', error);
    res.status(500).json({ error: 'Failed to fetch season summary' });
  }
});

// Get current offseason state
router.get('/offseason', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    if (franchise.phase !== 'offseason') {
      return res.status(400).json({ error: 'Not in offseason' });
    }

    const PHASE_ORDER = ['review', 'lottery', 'draft', 'free_agency', 'training_camp'];
    const currentIndex = PHASE_ORDER.indexOf(franchise.offseason_phase || 'review');
    const nextPhase = currentIndex < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentIndex + 1] : null;

    res.json({
      phase: 'offseason',
      offseason_phase: franchise.offseason_phase || 'review',
      next_phase: nextPhase,
      can_start_new_season: franchise.offseason_phase === 'training_camp'
    });
  } catch (error) {
    console.error('Get offseason state error:', error);
    res.status(500).json({ error: 'Failed to get offseason state' });
  }
});

// Advance to next offseason phase
router.post('/offseason/advance', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await withTransaction(async (client) => {
      // Lock franchise to prevent concurrent phase change
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      if (franchise.phase !== 'offseason') {
        throw { status: 400, message: 'Not in offseason' };
      }

      const PHASE_ORDER = ['review', 'lottery', 'draft', 'free_agency', 'training_camp'];
      const PHASE_LABELS: Record<string, string> = {
        review: 'Season Review',
        lottery: 'Draft Lottery',
        draft: 'NBA Draft',
        free_agency: 'Free Agency',
        training_camp: 'Training Camp'
      };

      const currentPhase = franchise.offseason_phase || 'review';
      const currentIndex = PHASE_ORDER.indexOf(currentPhase);

      if (currentIndex >= PHASE_ORDER.length - 1) {
        throw { status: 400, message: 'Already at final offseason phase. Start new season.' };
      }

      const nextPhase = PHASE_ORDER[currentIndex + 1];

      // Update franchise offseason phase
      await client.query(
        `UPDATE franchises SET offseason_phase = $1, last_played_at = NOW() WHERE id = $2`,
        [nextPhase, franchise.id]
      );

      return {
        message: `Advanced to ${PHASE_LABELS[nextPhase]}`,
        previous_phase: currentPhase,
        offseason_phase: nextPhase,
        phase_label: PHASE_LABELS[nextPhase],
        can_start_new_season: nextPhase === 'training_camp'
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Advance offseason phase error:', error);
    res.status(500).json({ error: 'Failed to advance offseason phase' });
  }
});

// Skip to specific offseason phase (for quick navigation)
router.post('/offseason/skip-to', authMiddleware(true), async (req: any, res) => {
  try {
    const { target_phase } = req.body;

    const VALID_PHASES = ['review', 'lottery', 'draft', 'free_agency', 'training_camp'];
    if (!VALID_PHASES.includes(target_phase)) {
      return res.status(400).json({ error: 'Invalid target phase' });
    }

    const result = await withTransaction(async (client) => {
      // Lock franchise to prevent concurrent phase change
      const franchise = await lockUserActiveFranchise(client, req.user.userId);

      if (!franchise) {
        throw { status: 404, message: 'No franchise found' };
      }

      if (franchise.phase !== 'offseason') {
        throw { status: 400, message: 'Not in offseason' };
      }

      await client.query(
        `UPDATE franchises SET offseason_phase = $1, last_played_at = NOW() WHERE id = $2`,
        [target_phase, franchise.id]
      );

      const PHASE_LABELS: Record<string, string> = {
        review: 'Season Review',
        lottery: 'Draft Lottery',
        draft: 'NBA Draft',
        free_agency: 'Free Agency',
        training_camp: 'Training Camp'
      };

      return {
        message: `Skipped to ${PHASE_LABELS[target_phase]}`,
        offseason_phase: target_phase,
        phase_label: PHASE_LABELS[target_phase],
        can_start_new_season: target_phase === 'training_camp'
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Skip to offseason phase error:', error);
    res.status(500).json({ error: 'Failed to skip to phase' });
  }
});

// Start new season (after offseason - requires training_camp phase)
router.post('/new', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No franchise found' });
    }

    if (franchise.phase !== 'offseason') {
      return res.status(400).json({ error: 'Must be in offseason to start new season' });
    }

    if (franchise.offseason_phase !== 'training_camp') {
      return res.status(400).json({
        error: 'Complete offseason activities first',
        current_phase: franchise.offseason_phase,
        required_phase: 'training_camp'
      });
    }

    // Create new season
    const seasonResult = await pool.query(
      `SELECT MAX(season_number) as max_season FROM seasons`
    );
    const newSeasonNumber = (seasonResult.rows[0].max_season || 0) + 1;

    const newSeasonId = await pool.query(
      `INSERT INTO seasons (season_number, status) VALUES ($1, 'preseason') RETURNING id`,
      [newSeasonNumber]
    );

    const newSeason = newSeasonId.rows[0];

    // Initialize standings for new season with all fields
    const teamsResult = await pool.query('SELECT id, conference, division FROM teams');
    const teams = teamsResult.rows;

    for (const t of teams) {
      await pool.query(
        `INSERT INTO standings (season_id, team_id, wins, losses, home_wins, home_losses,
         away_wins, away_losses, conference_wins, conference_losses, division_wins, division_losses,
         points_for, points_against, streak, last_10_wins)
         VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
        [newSeason.id, t.id]
      );
    }

    // Generate 8 preseason games
    const preseasonSchedule = generatePreseasonSchedule(teams);
    for (const game of preseasonSchedule) {
      const isUserGame = game.home_team_id === franchise.team_id || game.away_team_id === franchise.team_id;
      await pool.query(
        `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [newSeason.id, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame]
      );
    }

    // Auto-generate 82-game regular season schedule
    const schedule = generateSchedule(teams);
    for (const game of schedule) {
      const isUserGame = game.home_team_id === franchise.team_id || game.away_team_id === franchise.team_id;
      await pool.query(
        `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
        [newSeason.id, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame]
      );
    }

    // Update franchise - start in preseason, clear offseason_phase
    await pool.query(
      `UPDATE franchises SET season_id = $1, current_day = -7, phase = 'preseason', offseason_phase = NULL, season_number = $2, last_played_at = NOW() WHERE id = $3`,
      [newSeason.id, newSeasonNumber, franchise.id]
    );

    res.json({
      message: 'New season started',
      season_id: newSeason.id,
      season_number: newSeasonNumber,
      phase: 'preseason',
      current_day: -7
    });
  } catch (error) {
    console.error('New season error:', error);
    res.status(500).json({ error: 'Failed to create new season' });
  }
});

export default router;
