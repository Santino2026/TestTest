import { Router } from 'express';
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { authMiddleware } from '../auth';
import { getUserActiveFranchise, getCurrentSeasonId } from '../db/queries';
import { withAdvisoryLock, withTransaction, lockPlayoffSeries } from '../db/transactions';
import { savePlayoffGame } from '../services/gamePersistence';
import {
  generatePlayIn,
  generatePlayInGame3,
  checkPlayInGames12Complete,
  generateFirstRound,
  generateNextRound,
  saveSeries,
  updateSeriesResult,
  getPlayoffState,
  getPlayoffStandings,
  getRoundName
} from '../playoffs';

const router = Router();

// Get current playoff state
router.get('/', async (req, res) => {
  try {
    const seasonId = await getCurrentSeasonId();

    if (!seasonId) {
      return res.json({ round: 0, series: [], isComplete: false, champion: null });
    }

    const state = await getPlayoffState(seasonId);
    res.json(state);
  } catch (error) {
    console.error('Playoffs error:', error);
    res.status(500).json({ error: 'Failed to fetch playoffs' });
  }
});

// Start playoffs (generate play-in tournament)
router.post('/start', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(400).json({ error: 'No franchise selected' });
    }

    const seasonId = franchise.season_id;

    // Validate standings data exists before generating play-in (idempotent check outside transaction)
    const standingsResult = await pool.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN t.conference = 'Eastern' THEN 1 ELSE 0 END) as eastern,
              SUM(CASE WHEN t.conference = 'Western' THEN 1 ELSE 0 END) as western
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1`,
      [seasonId]
    );

    const standingsCount = standingsResult.rows[0];
    if (parseInt(standingsCount.total) < 30) {
      return res.status(400).json({
        error: `Regular season incomplete: only ${standingsCount.total}/30 teams have standings data. Complete the regular season first.`
      });
    }

    if (parseInt(standingsCount.eastern) < 10 || parseInt(standingsCount.western) < 10) {
      return res.status(400).json({
        error: `Insufficient conference standings: Eastern has ${standingsCount.eastern}, Western has ${standingsCount.western}. Need at least 10 per conference.`
      });
    }

    // Generate play-in tournament (generate data outside transaction, save inside)
    const playInSeries = await generatePlayIn(seasonId);

    if (playInSeries.length === 0) {
      return res.status(500).json({ error: 'Failed to generate play-in matchups - no series created' });
    }

    // Wrap all writes in transaction to prevent race conditions
    await withTransaction(async (client) => {
      // Check if playoffs already started (inside transaction to prevent race)
      const existingResult = await client.query(
        'SELECT COUNT(*) FROM playoff_series WHERE season_id = $1',
        [seasonId]
      );

      if (parseInt(existingResult.rows[0].count) > 0) {
        throw { status: 400, message: 'Playoffs already started' };
      }

      // Save series
      await saveSeries(playInSeries, client);

      // Update franchise phase
      await client.query(
        `UPDATE franchises SET phase = 'playoffs' WHERE id = $1`,
        [franchise.id]
      );

      // Update season status
      await client.query(
        `UPDATE seasons SET status = 'playoffs' WHERE id = $1`,
        [seasonId]
      );
    });

    res.json({
      message: 'Playoffs started',
      round: 0,
      roundName: getRoundName(0),
      series: playInSeries.length
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Start playoffs error:', error);
    res.status(500).json({ error: 'Failed to start playoffs' });
  }
});

// Simulate a playoff game
router.post('/simulate', authMiddleware(true), async (req: any, res) => {
  try {
    const { series_id } = req.body;

    if (!series_id) {
      return res.status(400).json({ error: 'series_id is required' });
    }

    // Use advisory lock to prevent concurrent simulations of the same series
    const gameResult = await withAdvisoryLock(`playoff-series-${series_id}`, async (client) => {
      // Lock and get series info
      const series = await lockPlayoffSeries(client, series_id);

      if (!series) {
        throw { status: 404, message: 'Series not found' };
      }

      if (series.status === 'completed') {
        throw { status: 400, message: 'Series already completed' };
      }

      // Determine home team (alternates 2-2-1-1-1)
      const gamesPlayed = series.higher_seed_wins + series.lower_seed_wins;
      const homeIsHigherSeed = [0, 1, 4, 6].includes(gamesPlayed);
      const homeTeamId = homeIsHigherSeed ? series.higher_seed_id : series.lower_seed_id;
      const awayTeamId = homeIsHigherSeed ? series.lower_seed_id : series.higher_seed_id;

      // Load teams and simulate
      const homeTeam = await loadTeamForSimulation(homeTeamId);
      const awayTeam = await loadTeamForSimulation(awayTeamId);
      const result = simulateGame(homeTeam, awayTeam);

      // Save game using helper
      await savePlayoffGame(result, series.season_id);

      // Update series
      const { seriesComplete, seriesWinner } = await updateSeriesResult(
        series_id,
        result.winner_id,
        result.id
      );

      // Check if we need to generate next round
      if (seriesComplete) {
        // Check if all series in current round are complete
        const roundResult = await pool.query(
          `SELECT * FROM playoff_series
           WHERE season_id = $1 AND round = $2 AND status != 'completed'`,
          [series.season_id, series.round]
        );

        if (roundResult.rows.length === 0) {
          // All series in round complete, generate next round
          let nextSeries: any[] = [];

          if (series.round === 0) {
            // Play-in: Check if we need to generate game 3 or first round
            for (const conf of ['Eastern', 'Western']) {
              const check = await checkPlayInGames12Complete(series.season_id, conf);
              if (check.complete && check.loser7v8 && check.winner9v10) {
                const game3 = await generatePlayInGame3(
                  series.season_id,
                  conf,
                  check.loser7v8,
                  check.winner9v10
                );
                await saveSeries([game3]);
              }
            }

            // Check if ALL play-in games (including game 3) are complete
            const allPlayInResult = await pool.query(
              `SELECT * FROM playoff_series
               WHERE season_id = $1 AND round = 0
               ORDER BY conference, series_number`,
              [series.season_id]
            );

            const playInSeries = allPlayInResult.rows;
            const allComplete = playInSeries.every((s: any) => s.status === 'completed');

            if (allComplete && playInSeries.length === 6) {
              const eastern7Winner = playInSeries.find((s: any) =>
                s.conference === 'Eastern' && s.series_number === 1
              )?.winner_id;
              const eastern8Winner = playInSeries.find((s: any) =>
                s.conference === 'Eastern' && s.series_number === 3
              )?.winner_id;
              const western7Winner = playInSeries.find((s: any) =>
                s.conference === 'Western' && s.series_number === 1
              )?.winner_id;
              const western8Winner = playInSeries.find((s: any) =>
                s.conference === 'Western' && s.series_number === 3
              )?.winner_id;

              nextSeries = await generateFirstRound(series.season_id, {
                eastern7: eastern7Winner,
                eastern8: eastern8Winner,
                western7: western7Winner,
                western8: western8Winner
              });
            }
          } else if (series.round < 4) {
            nextSeries = await generateNextRound(series.season_id, series.round + 1);
          }

          if (nextSeries.length > 0) {
            await saveSeries(nextSeries);
          }
        }
      }

      return {
        game_id: result.id,
        home_team: homeTeam.name,
        away_team: awayTeam.name,
        home_score: result.home_score,
        away_score: result.away_score,
        winner: result.winner_id === homeTeamId ? homeTeam.name : awayTeam.name,
        series_complete: seriesComplete,
        series_winner: seriesWinner
      };
    });

    res.json(gameResult);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Playoff simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate playoff game' });
  }
});

// Simulate entire series until complete
router.post('/simulate/series', authMiddleware(true), async (req: any, res) => {
  try {
    const { series_id } = req.body;

    if (!series_id) {
      return res.status(400).json({ error: 'series_id is required' });
    }

    // Get series info
    const seriesResult = await pool.query(
      `SELECT ps.*,
              ht.name as higher_name, ht.abbreviation as higher_abbrev,
              lt.name as lower_name, lt.abbreviation as lower_abbrev
       FROM playoff_series ps
       JOIN teams ht ON ps.higher_seed_id = ht.id
       JOIN teams lt ON ps.lower_seed_id = lt.id
       WHERE ps.id = $1`,
      [series_id]
    );

    if (seriesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }

    let series = seriesResult.rows[0];

    if (series.status === 'completed') {
      return res.status(400).json({ error: 'Series already completed' });
    }

    const gamesSimulated = [];
    const winsNeeded = series.round === 0 ? 1 : 4; // Play-in is single game, others best of 7

    // Simulate until series is complete
    while (series.higher_seed_wins < winsNeeded && series.lower_seed_wins < winsNeeded) {
      const gamesPlayed = series.higher_seed_wins + series.lower_seed_wins;
      const homeIsHigherSeed = [0, 1, 4, 6].includes(gamesPlayed);
      const homeTeamId = homeIsHigherSeed ? series.higher_seed_id : series.lower_seed_id;
      const awayTeamId = homeIsHigherSeed ? series.lower_seed_id : series.higher_seed_id;

      const homeTeam = await loadTeamForSimulation(homeTeamId);
      const awayTeam = await loadTeamForSimulation(awayTeamId);
      const result = simulateGame(homeTeam, awayTeam);

      // Save game using helper
      await savePlayoffGame(result, series.season_id);

      // Update series
      await updateSeriesResult(series_id, result.winner_id, result.id);

      gamesSimulated.push({
        home_team: homeTeam.name,
        away_team: awayTeam.name,
        home_score: result.home_score,
        away_score: result.away_score,
        winner: result.winner_id === homeTeamId ? homeTeam.name : awayTeam.name
      });

      // Refresh series data
      const refreshResult = await pool.query(
        'SELECT * FROM playoff_series WHERE id = $1',
        [series_id]
      );
      series = refreshResult.rows[0];
    }

    // Generate next round if needed
    const roundComplete = await pool.query(
      `SELECT * FROM playoff_series
       WHERE season_id = $1 AND round = $2 AND status != 'completed'`,
      [series.season_id, series.round]
    );

    if (roundComplete.rows.length === 0) {
      let nextSeries: any[] = [];

      if (series.round === 0) {
        // Play-in: Check if we need to generate game 3 or first round
        for (const conf of ['Eastern', 'Western']) {
          const check = await checkPlayInGames12Complete(series.season_id, conf);
          if (check.complete && check.loser7v8 && check.winner9v10) {
            const game3 = await generatePlayInGame3(series.season_id, conf, check.loser7v8, check.winner9v10);
            await saveSeries([game3]);
          }
        }

        // Check if ALL play-in games are complete
        const playInResult = await pool.query(
          `SELECT * FROM playoff_series WHERE season_id = $1 AND round = 0 ORDER BY conference, series_number`,
          [series.season_id]
        );
        const playInSeries = playInResult.rows;
        const allComplete = playInSeries.every((s: any) => s.status === 'completed');

        if (allComplete && playInSeries.length === 6) {
          nextSeries = await generateFirstRound(series.season_id, {
            eastern7: playInSeries.find((s: any) => s.conference === 'Eastern' && s.series_number === 1)?.winner_id,
            eastern8: playInSeries.find((s: any) => s.conference === 'Eastern' && s.series_number === 3)?.winner_id,
            western7: playInSeries.find((s: any) => s.conference === 'Western' && s.series_number === 1)?.winner_id,
            western8: playInSeries.find((s: any) => s.conference === 'Western' && s.series_number === 3)?.winner_id
          });
        }
      } else if (series.round < 4) {
        nextSeries = await generateNextRound(series.season_id, series.round + 1);
      }

      if (nextSeries.length > 0) {
        await saveSeries(nextSeries);
      }
    }

    // Refresh series one more time
    const finalResult = await pool.query(
      `SELECT ps.*, wt.name as winner_name
       FROM playoff_series ps
       LEFT JOIN teams wt ON ps.winner_id = wt.id
       WHERE ps.id = $1`,
      [series_id]
    );

    res.json({
      series_id,
      games_simulated: gamesSimulated.length,
      games: gamesSimulated,
      winner: finalResult.rows[0].winner_name,
      series_score: `${finalResult.rows[0].higher_seed_wins}-${finalResult.rows[0].lower_seed_wins}`
    });
  } catch (error) {
    console.error('Simulate series error:', error);
    res.status(500).json({ error: 'Failed to simulate series' });
  }
});

// Simulate entire round
router.post('/simulate/round', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(400).json({ error: 'No franchise selected' });
    }

    const seasonId = franchise.season_id;

    // Get current round
    const currentRoundResult = await pool.query(
      `SELECT MAX(round) as current_round FROM playoff_series WHERE season_id = $1`,
      [seasonId]
    );
    const currentRound = currentRoundResult.rows[0].current_round;

    if (currentRound === null) {
      return res.status(400).json({ error: 'No playoff series found' });
    }

    // Get all incomplete series in current round
    const incompleteSeries = await pool.query(
      `SELECT id FROM playoff_series WHERE season_id = $1 AND round = $2 AND status != 'completed'`,
      [seasonId, currentRound]
    );

    const results = [];
    const winsNeeded = currentRound === 0 ? 1 : 4;

    for (const seriesRow of incompleteSeries.rows) {
      const seriesResult = await pool.query('SELECT * FROM playoff_series WHERE id = $1', [seriesRow.id]);
      let series = seriesResult.rows[0] as any;

      while (series.higher_seed_wins < winsNeeded && series.lower_seed_wins < winsNeeded) {
        const gamesPlayed = series.higher_seed_wins + series.lower_seed_wins;
        const homeIsHigherSeed = [0, 1, 4, 6].includes(gamesPlayed);
        const homeTeamId = homeIsHigherSeed ? series.higher_seed_id : series.lower_seed_id;
        const awayTeamId = homeIsHigherSeed ? series.lower_seed_id : series.higher_seed_id;

        const homeTeam = await loadTeamForSimulation(homeTeamId);
        const awayTeam = await loadTeamForSimulation(awayTeamId);
        const result = simulateGame(homeTeam, awayTeam);

        // Save game using helper
        await savePlayoffGame(result, seasonId);

        await updateSeriesResult(seriesRow.id, result.winner_id, result.id);

        const refreshResult = await pool.query('SELECT * FROM playoff_series WHERE id = $1', [seriesRow.id]);
        series = refreshResult.rows[0];
      }

      const finalSeries = await pool.query(
        `SELECT ps.*, wt.name as winner_name FROM playoff_series ps LEFT JOIN teams wt ON ps.winner_id = wt.id WHERE ps.id = $1`,
        [seriesRow.id]
      );
      results.push({
        series_id: seriesRow.id,
        winner: finalSeries.rows[0].winner_name,
        score: `${finalSeries.rows[0].higher_seed_wins}-${finalSeries.rows[0].lower_seed_wins}`
      });
    }

    // Generate next round
    if (currentRound < 4) {
      let nextSeries: any[] = [];
      if (currentRound === 0) {
        // Play-in: Check if we need to generate game 3 first
        for (const conf of ['Eastern', 'Western']) {
          const check = await checkPlayInGames12Complete(seasonId, conf);
          if (check.complete && check.loser7v8 && check.winner9v10) {
            const game3 = await generatePlayInGame3(seasonId, conf, check.loser7v8, check.winner9v10);
            await saveSeries([game3]);
          }
        }

        // Check if ALL play-in games are complete
        const playInResult = await pool.query(
          `SELECT * FROM playoff_series WHERE season_id = $1 AND round = 0 ORDER BY conference, series_number`,
          [seasonId]
        );
        const playInSeries = playInResult.rows;
        const allComplete = playInSeries.every((s: any) => s.status === 'completed');

        if (allComplete && playInSeries.length === 6) {
          nextSeries = await generateFirstRound(seasonId, {
            eastern7: playInSeries.find((s: any) => s.conference === 'Eastern' && s.series_number === 1)?.winner_id,
            eastern8: playInSeries.find((s: any) => s.conference === 'Eastern' && s.series_number === 3)?.winner_id,
            western7: playInSeries.find((s: any) => s.conference === 'Western' && s.series_number === 1)?.winner_id,
            western8: playInSeries.find((s: any) => s.conference === 'Western' && s.series_number === 3)?.winner_id
          });
        }
      } else {
        nextSeries = await generateNextRound(seasonId, currentRound + 1);
      }
      if (nextSeries.length > 0) {
        await saveSeries(nextSeries);
      }
    }

    res.json({
      round: currentRound,
      round_name: getRoundName(currentRound),
      series_completed: results.length,
      results
    });
  } catch (error) {
    console.error('Simulate round error:', error);
    res.status(500).json({ error: 'Failed to simulate round' });
  }
});

// Simulate all remaining playoffs
router.post('/simulate/all', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);

    if (!franchise) {
      return res.status(400).json({ error: 'No franchise selected' });
    }

    const seasonId = franchise.season_id;

    const roundResults = [];
    let playoffsComplete = false;

    while (!playoffsComplete) {
      // Get current round
      const currentRoundResult = await pool.query(
        `SELECT MAX(round) as current_round FROM playoff_series WHERE season_id = $1`,
        [seasonId]
      );
      const currentRound = currentRoundResult.rows[0].current_round;

      if (currentRound === null) break;

      // Check if Finals are complete
      if (currentRound === 4) {
        const finalsResult = await pool.query(
          `SELECT status FROM playoff_series WHERE season_id = $1 AND round = 4`,
          [seasonId]
        );
        if (finalsResult.rows[0]?.status === 'completed') {
          playoffsComplete = true;
          break;
        }
      }

      // Get all incomplete series in current round
      const incompleteSeries = await pool.query(
        `SELECT id FROM playoff_series WHERE season_id = $1 AND round = $2 AND status != 'completed'`,
        [seasonId, currentRound]
      );

      if (incompleteSeries.rows.length === 0 && currentRound === 4) {
        playoffsComplete = true;
        break;
      }

      const winsNeeded = currentRound === 0 ? 1 : 4;
      const seriesResults = [];

      for (const seriesRow of incompleteSeries.rows) {
        const seriesQueryResult = await pool.query('SELECT * FROM playoff_series WHERE id = $1', [seriesRow.id]);
        let series = seriesQueryResult.rows[0] as any;

        while (series.higher_seed_wins < winsNeeded && series.lower_seed_wins < winsNeeded) {
          const gamesPlayed = series.higher_seed_wins + series.lower_seed_wins;
          const homeIsHigherSeed = [0, 1, 4, 6].includes(gamesPlayed);
          const homeTeamId = homeIsHigherSeed ? series.higher_seed_id : series.lower_seed_id;
          const awayTeamId = homeIsHigherSeed ? series.lower_seed_id : series.higher_seed_id;

          const homeTeam = await loadTeamForSimulation(homeTeamId);
          const awayTeam = await loadTeamForSimulation(awayTeamId);
          const result = simulateGame(homeTeam, awayTeam);

          // Save game using helper
          await savePlayoffGame(result, seasonId);

          await updateSeriesResult(seriesRow.id, result.winner_id, result.id);

          const refreshResult = await pool.query('SELECT * FROM playoff_series WHERE id = $1', [seriesRow.id]);
          series = refreshResult.rows[0];
        }

        const finalSeries = await pool.query(
          `SELECT ps.*, wt.name as winner_name FROM playoff_series ps LEFT JOIN teams wt ON ps.winner_id = wt.id WHERE ps.id = $1`,
          [seriesRow.id]
        );
        seriesResults.push({
          winner: finalSeries.rows[0].winner_name,
          score: `${finalSeries.rows[0].higher_seed_wins}-${finalSeries.rows[0].lower_seed_wins}`
        });
      }

      roundResults.push({
        round: currentRound,
        round_name: getRoundName(currentRound),
        series: seriesResults
      });

      // Generate next round
      if (currentRound < 4) {
        let nextSeries: any[] = [];
        if (currentRound === 0) {
          // Play-in: Check if we need to generate game 3 first
          for (const conf of ['Eastern', 'Western']) {
            const check = await checkPlayInGames12Complete(seasonId, conf);
            if (check.complete && check.loser7v8 && check.winner9v10) {
              const game3 = await generatePlayInGame3(seasonId, conf, check.loser7v8, check.winner9v10);
              await saveSeries([game3]);
            }
          }

          // Check if ALL play-in games are complete
          const playInResult = await pool.query(
            `SELECT * FROM playoff_series WHERE season_id = $1 AND round = 0 ORDER BY conference, series_number`,
            [seasonId]
          );
          const playInSeries = playInResult.rows;
          const allComplete = playInSeries.every((s: any) => s.status === 'completed');

          if (allComplete && playInSeries.length === 6) {
            nextSeries = await generateFirstRound(seasonId, {
              eastern7: playInSeries.find((s: any) => s.conference === 'Eastern' && s.series_number === 1)?.winner_id,
              eastern8: playInSeries.find((s: any) => s.conference === 'Eastern' && s.series_number === 3)?.winner_id,
              western7: playInSeries.find((s: any) => s.conference === 'Western' && s.series_number === 1)?.winner_id,
              western8: playInSeries.find((s: any) => s.conference === 'Western' && s.series_number === 3)?.winner_id
            });
          }
        } else {
          nextSeries = await generateNextRound(seasonId, currentRound + 1);
        }
        if (nextSeries.length > 0) {
          await saveSeries(nextSeries);
        }
      } else {
        playoffsComplete = true;
      }
    }

    // Get champion
    const championResult = await pool.query(
      `SELECT ps.winner_id, t.name as champion_name, t.abbreviation, t.city
       FROM playoff_series ps
       JOIN teams t ON ps.winner_id = t.id
       WHERE ps.season_id = $1 AND ps.round = 4`,
      [seasonId]
    );

    res.json({
      message: 'Playoffs complete!',
      rounds_simulated: roundResults.length,
      rounds: roundResults,
      champion: championResult.rows[0] ? {
        name: `${championResult.rows[0].city} ${championResult.rows[0].champion_name}`,
        abbreviation: championResult.rows[0].abbreviation
      } : null
    });
  } catch (error) {
    console.error('Simulate all playoffs error:', error);
    res.status(500).json({ error: 'Failed to simulate playoffs' });
  }
});

// Get playoff standings (for seeding display)
router.get('/standings', async (req, res) => {
  try {
    const seasonId = await getCurrentSeasonId();

    if (!seasonId) {
      return res.json({ eastern: [], western: [] });
    }

    const standings = await getPlayoffStandings(seasonId);
    res.json(standings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playoff standings' });
  }
});

export default router;
