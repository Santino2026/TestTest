import { Router } from 'express';
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { getCurrentSeasonId } from '../db/queries';
import { saveCompleteGameResult, GameResult } from '../services/gamePersistence';

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
      const seasonId = await getCurrentSeasonId();

      if (seasonId) {
        // Convert to GameResult format
        const gameResult: GameResult = {
          id: result.id,
          home_team_id: result.home_team_id,
          away_team_id: result.away_team_id,
          home_score: result.home_score,
          away_score: result.away_score,
          winner_id: result.winner_id,
          is_overtime: result.is_overtime,
          overtime_periods: result.overtime_periods,
          quarters: result.quarters,
          home_stats: result.home_stats,
          away_stats: result.away_stats,
          home_player_stats: result.home_player_stats.map((ps: any) => ({
            ...ps,
            player_id: ps.player_id
          })),
          away_player_stats: result.away_player_stats.map((ps: any) => ({
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
          true // Update standings
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
