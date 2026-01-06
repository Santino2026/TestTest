import { Router } from 'express';
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';

const router = Router();

// Simulate a game between two teams
router.post('/simulate', async (req, res) => {
  try {
    const { home_team_id, away_team_id, save_result = true } = req.body;

    if (!home_team_id || !away_team_id) {
      return res.status(400).json({ error: 'home_team_id and away_team_id are required' });
    }

    // Load teams with full player data
    const homeTeam = await loadTeamForSimulation(home_team_id);
    const awayTeam = await loadTeamForSimulation(away_team_id);

    // Run simulation
    const result = simulateGame(homeTeam, awayTeam);

    // Optionally save to database
    if (save_result) {
      // Get current season
      const seasonResult = await pool.query(
        `SELECT id FROM seasons WHERE status != 'completed' ORDER BY season_number DESC LIMIT 1`
      );
      const seasonId = seasonResult.rows[0]?.id;

      // Insert game record
      await pool.query(
        `INSERT INTO games (id, season_id, home_team_id, away_team_id, home_score, away_score,
                           winner_id, is_overtime, overtime_periods, status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', NOW())
         RETURNING id`,
        [result.id, seasonId, result.home_team_id, result.away_team_id,
         result.home_score, result.away_score, result.winner_id,
         result.is_overtime, result.overtime_periods]
      );

      // Insert quarter scores
      for (const quarter of result.quarters) {
        await pool.query(
          `INSERT INTO game_quarters (game_id, quarter, home_points, away_points)
           VALUES ($1, $2, $3, $4)`,
          [result.id, quarter.quarter, quarter.home_points, quarter.away_points]
        );
      }

      // Insert team stats
      await pool.query(
        `INSERT INTO team_game_stats (game_id, team_id, is_home, points, fgm, fga, fg_pct,
                                      three_pm, three_pa, three_pct, ftm, fta, ft_pct,
                                      oreb, dreb, rebounds, assists, steals, blocks,
                                      turnovers, fouls)
         VALUES ($1, $2, true, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [result.id, result.home_team_id, result.home_stats.points,
         result.home_stats.fgm, result.home_stats.fga, result.home_stats.fg_pct,
         result.home_stats.three_pm, result.home_stats.three_pa, result.home_stats.three_pct,
         result.home_stats.ftm, result.home_stats.fta, result.home_stats.ft_pct,
         result.home_stats.oreb, result.home_stats.dreb, result.home_stats.rebounds,
         result.home_stats.assists, result.home_stats.steals, result.home_stats.blocks,
         result.home_stats.turnovers, result.home_stats.fouls]
      );

      await pool.query(
        `INSERT INTO team_game_stats (game_id, team_id, is_home, points, fgm, fga, fg_pct,
                                      three_pm, three_pa, three_pct, ftm, fta, ft_pct,
                                      oreb, dreb, rebounds, assists, steals, blocks,
                                      turnovers, fouls)
         VALUES ($1, $2, false, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [result.id, result.away_team_id, result.away_stats.points,
         result.away_stats.fgm, result.away_stats.fga, result.away_stats.fg_pct,
         result.away_stats.three_pm, result.away_stats.three_pa, result.away_stats.three_pct,
         result.away_stats.ftm, result.away_stats.fta, result.away_stats.ft_pct,
         result.away_stats.oreb, result.away_stats.dreb, result.away_stats.rebounds,
         result.away_stats.assists, result.away_stats.steals, result.away_stats.blocks,
         result.away_stats.turnovers, result.away_stats.fouls]
      );

      // Insert player stats (only for players who played)
      for (const ps of [...result.home_player_stats, ...result.away_player_stats]) {
        if (ps.minutes > 0) {
          const playerTeamId = result.home_player_stats.includes(ps)
            ? result.home_team_id
            : result.away_team_id;
          const isStarter = result.home_player_stats.includes(ps)
            ? homeTeam.starters.some(s => s.id === (ps as any).player_id)
            : awayTeam.starters.some(s => s.id === (ps as any).player_id);

          await pool.query(
            `INSERT INTO player_game_stats
             (game_id, player_id, team_id, minutes, points, fgm, fga, three_pm, three_pa,
              ftm, fta, oreb, dreb, rebounds, assists, steals, blocks, turnovers, fouls,
              plus_minus, is_starter)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
             ON CONFLICT (game_id, player_id) DO NOTHING`,
            [result.id, (ps as any).player_id, playerTeamId, ps.minutes, ps.points,
             ps.fgm, ps.fga, ps.three_pm, ps.three_pa, ps.ftm, ps.fta,
             ps.oreb, ps.dreb, ps.rebounds, ps.assists, ps.steals, ps.blocks,
             ps.turnovers, ps.fouls, ps.plus_minus, isStarter]
          );
        }
      }

      // Update standings with wins/losses, points, and division/conference records
      if (seasonId) {
        const homeWon = result.winner_id === result.home_team_id;

        // Get conference/division info for both teams
        const teamsInfoResult = await pool.query(
          `SELECT id, conference, division FROM teams WHERE id IN ($1, $2)`,
          [result.home_team_id, result.away_team_id]
        );
        const teamsInfo = teamsInfoResult.rows.reduce((acc: any, t: any) => {
          acc[t.id] = t;
          return acc;
        }, {});
        const homeInfo = teamsInfo[result.home_team_id];
        const awayInfo = teamsInfo[result.away_team_id];
        const sameConference = homeInfo?.conference === awayInfo?.conference;
        const sameDivision = homeInfo?.division === awayInfo?.division;

        // Update home team
        await pool.query(
          `UPDATE standings SET
             wins = wins + $3,
             losses = losses + $4,
             points_for = COALESCE(points_for, 0) + $5,
             points_against = COALESCE(points_against, 0) + $6,
             conference_wins = conference_wins + $7,
             conference_losses = conference_losses + $8,
             division_wins = division_wins + $9,
             division_losses = division_losses + $10
           WHERE season_id = $1 AND team_id = $2`,
          [seasonId, result.home_team_id, homeWon ? 1 : 0, homeWon ? 0 : 1, result.home_score, result.away_score,
           sameConference && homeWon ? 1 : 0, sameConference && !homeWon ? 1 : 0,
           sameDivision && homeWon ? 1 : 0, sameDivision && !homeWon ? 1 : 0]
        );

        // Update away team
        await pool.query(
          `UPDATE standings SET
             wins = wins + $3,
             losses = losses + $4,
             points_for = COALESCE(points_for, 0) + $5,
             points_against = COALESCE(points_against, 0) + $6,
             conference_wins = conference_wins + $7,
             conference_losses = conference_losses + $8,
             division_wins = division_wins + $9,
             division_losses = division_losses + $10
           WHERE season_id = $1 AND team_id = $2`,
          [seasonId, result.away_team_id, homeWon ? 0 : 1, homeWon ? 1 : 0, result.away_score, result.home_score,
           sameConference && !homeWon ? 1 : 0, sameConference && homeWon ? 1 : 0,
           sameDivision && !homeWon ? 1 : 0, sameDivision && homeWon ? 1 : 0]
        );
      }
    }

    // Return result (with abbreviated play-by-play for performance)
    const condensedResult = {
      ...result,
      plays: result.plays.slice(-50) // Last 50 plays for performance
    };

    res.json(condensedResult);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      error: 'Failed to simulate game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get game details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get game
    const gameResult = await pool.query(
      `SELECT g.*,
              ht.name as home_team_name, ht.abbreviation as home_abbrev,
              at.name as away_team_name, at.abbreviation as away_abbrev
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE g.id = $1`,
      [id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get quarters
    const quartersResult = await pool.query(
      `SELECT * FROM game_quarters WHERE game_id = $1 ORDER BY quarter`,
      [id]
    );

    // Get team stats
    const teamStatsResult = await pool.query(
      `SELECT tgs.*, t.name, t.abbreviation
       FROM team_game_stats tgs
       JOIN teams t ON tgs.team_id = t.id
       WHERE tgs.game_id = $1`,
      [id]
    );

    // Get player stats
    const playerStatsResult = await pool.query(
      `SELECT pgs.*, p.first_name, p.last_name, p.position
       FROM player_game_stats pgs
       JOIN players p ON pgs.player_id = p.id
       WHERE pgs.game_id = $1
       ORDER BY pgs.points DESC`,
      [id]
    );

    res.json({
      ...gameResult.rows[0],
      quarters: quartersResult.rows,
      team_stats: teamStatsResult.rows,
      player_stats: playerStatsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Get play-by-play for a game
router.get('/:id/plays', async (req, res) => {
  try {
    const { id } = req.params;
    const quarter = req.query.quarter ? parseInt(req.query.quarter as string) : null;

    let query = `
      SELECT pl.*,
             p1.first_name as primary_first_name, p1.last_name as primary_last_name,
             p2.first_name as secondary_first_name, p2.last_name as secondary_last_name,
             t.abbreviation as team_abbrev
      FROM plays pl
      LEFT JOIN players p1 ON pl.primary_player_id = p1.id
      LEFT JOIN players p2 ON pl.secondary_player_id = p2.id
      LEFT JOIN teams t ON pl.team_id = t.id
      WHERE pl.game_id = $1
    `;
    const params: any[] = [id];

    if (quarter) {
      query += ` AND pl.quarter = $2`;
      params.push(quarter);
    }

    query += ` ORDER BY pl.play_order`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plays' });
  }
});

// Get list of recent games
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const teamId = req.query.team_id as string;
    const seasonId = req.query.season_id as string;

    let query = `
      SELECT g.*,
             ht.name as home_team_name, ht.abbreviation as home_abbrev,
             at.name as away_team_name, at.abbreviation as away_abbrev
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE g.status = 'completed'
    `;
    const params: any[] = [];

    // Filter by season_id if provided
    if (seasonId) {
      params.push(seasonId);
      query += ` AND g.season_id = $${params.length}`;
    }

    if (teamId) {
      params.push(teamId);
      query += ` AND (g.home_team_id = $${params.length} OR g.away_team_id = $${params.length})`;
    }

    query += ` ORDER BY g.completed_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

export default router;
