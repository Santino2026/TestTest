import { Router } from 'express';
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { getCurrentSeasonId } from '../db/queries';
import { saveCompleteGameResult, GameResult } from '../services/gamePersistence';

const router = Router();

// Simple UUID format check
const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

router.post('/simulate', async (req, res) => {
  try {
    const { home_team_id, away_team_id, save_result = true } = req.body;
    if (!home_team_id || !away_team_id) {
      return res.status(400).json({ error: 'home_team_id and away_team_id are required' });
    }

    if (!isValidUUID(home_team_id) || !isValidUUID(away_team_id)) {
      return res.status(400).json({ error: 'Invalid team ID format' });
    }

    const [homeTeam, awayTeam] = await Promise.all([
      loadTeamForSimulation(home_team_id),
      loadTeamForSimulation(away_team_id)
    ]);

    if (!homeTeam || !awayTeam) {
      return res.status(404).json({ error: 'One or both teams not found' });
    }

    const result = simulateGame(homeTeam, awayTeam);

    if (save_result) {
      const seasonId = await getCurrentSeasonId();
      if (seasonId) {
        const gameResult: GameResult = {
          ...result,
          home_player_stats: result.home_player_stats.map((ps: any) => ({ ...ps, player_id: ps.player_id })),
          away_player_stats: result.away_player_stats.map((ps: any) => ({ ...ps, player_id: ps.player_id }))
        };
        await saveCompleteGameResult(
          gameResult,
          seasonId,
          { id: homeTeam.id, starters: homeTeam.starters },
          { id: awayTeam.id, starters: awayTeam.starters },
          true
        );
      }
    }

    res.json({ ...result, plays: result.plays.slice(-50) });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      error: 'Failed to simulate game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [gameResult, quartersResult, teamStatsResult, playerStatsResult] = await Promise.all([
      pool.query(
        `SELECT g.*, ht.name as home_team_name, ht.abbreviation as home_abbrev,
                at.name as away_team_name, at.abbreviation as away_abbrev
         FROM games g
         JOIN teams ht ON g.home_team_id = ht.id
         JOIN teams at ON g.away_team_id = at.id
         WHERE g.id = $1`,
        [id]
      ),
      pool.query(`SELECT * FROM game_quarters WHERE game_id = $1 ORDER BY quarter`, [id]),
      pool.query(
        `SELECT tgs.*, t.name, t.abbreviation FROM team_game_stats tgs
         JOIN teams t ON tgs.team_id = t.id WHERE tgs.game_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT pgs.*, p.first_name, p.last_name, p.position FROM player_game_stats pgs
         JOIN players p ON pgs.player_id = p.id WHERE pgs.game_id = $1 ORDER BY pgs.points DESC`,
        [id]
      )
    ]);

    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found' });

    res.json({
      ...gameResult.rows[0],
      quarters: quartersResult.rows,
      team_stats: teamStatsResult.rows.map(ts => ({
        ...ts,
        fg_pct: parseFloat(ts.fg_pct) || 0,
        three_pct: parseFloat(ts.three_pct) || 0
      })),
      player_stats: playerStatsResult.rows.map(ps => ({
        ...ps,
        minutes: parseFloat(ps.minutes) || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

router.get('/:id/plays', async (req, res) => {
  try {
    const { id } = req.params;
    const quarter = req.query.quarter ? parseInt(req.query.quarter as string) : null;
    const params: any[] = [id];
    const quarterFilter = quarter ? (params.push(quarter), ` AND pl.quarter = $2`) : '';

    const result = await pool.query(
      `SELECT pl.*, p1.first_name as primary_first_name, p1.last_name as primary_last_name,
              p2.first_name as secondary_first_name, p2.last_name as secondary_last_name,
              t.abbreviation as team_abbrev
       FROM plays pl
       LEFT JOIN players p1 ON pl.primary_player_id = p1.id
       LEFT JOIN players p2 ON pl.secondary_player_id = p2.id
       LEFT JOIN teams t ON pl.team_id = t.id
       WHERE pl.game_id = $1${quarterFilter} ORDER BY pl.play_order`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plays' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { team_id, season_id } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const params: any[] = [];
    const conditions: string[] = [`g.status = 'completed'`];

    if (season_id) {
      params.push(season_id);
      conditions.push(`g.season_id = $${params.length}`);
    }
    if (team_id) {
      params.push(team_id);
      conditions.push(`(g.home_team_id = $${params.length} OR g.away_team_id = $${params.length})`);
    }

    params.push(limit);
    const result = await pool.query(
      `SELECT g.*, ht.name as home_team_name, ht.abbreviation as home_abbrev,
              at.name as away_team_name, at.abbreviation as away_abbrev
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY g.completed_at DESC LIMIT $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

export default router;
