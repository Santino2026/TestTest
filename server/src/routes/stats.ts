// Statistics API Routes
import { Router } from 'express';
import { pool } from '../db/pool';
import { getLatestSeasonId } from '../db/queries';
import {
  calculateTrueShootingPct,
  calculateEffectiveFgPct,
  calculatePER,
  calculateGameScore,
  calculatePerGameAverages,
  BasicStats
} from '../statistics';

const router = Router();

// Get league leaders for various categories
router.get('/leaders', async (req, res) => {
  try {
    // Support both 'stat' (from client) and 'category' (legacy) parameters
    const stat = (req.query.stat as string) || (req.query.category as string) || 'points';
    const limit = parseInt(req.query.limit as string) || 20;

    const seasonId = await getLatestSeasonId();

    if (!seasonId) {
      return res.json([]);
    }

    // Map stat name to database column with proper NULL handling
    // For computed percentages, use CASE. For stored stats, use COALESCE.
    const statMap: Record<string, { column: string; isComputed: boolean; minGames?: number; minAttempts?: string }> = {
      points: { column: 'ppg', isComputed: false },
      ppg: { column: 'ppg', isComputed: false },
      rebounds: { column: 'rpg', isComputed: false },
      rpg: { column: 'rpg', isComputed: false },
      assists: { column: 'apg', isComputed: false },
      apg: { column: 'apg', isComputed: false },
      steals: { column: 'spg', isComputed: false },
      spg: { column: 'spg', isComputed: false },
      blocks: { column: 'bpg', isComputed: false },
      bpg: { column: 'bpg', isComputed: false },
      fg_pct: { column: 'CASE WHEN pss.fga > 0 THEN pss.fgm::float / pss.fga ELSE 0 END', isComputed: true, minAttempts: 'fga >= 50' },
      three_pct: { column: 'CASE WHEN pss.three_pa > 0 THEN pss.three_pm::float / pss.three_pa ELSE 0 END', isComputed: true, minAttempts: 'three_pa >= 30' },
      ft_pct: { column: 'CASE WHEN pss.fta > 0 THEN pss.ftm::float / pss.fta ELSE 0 END', isComputed: true, minAttempts: 'fta >= 25' },
      per: { column: 'per', isComputed: false },
      true_shooting: { column: 'true_shooting_pct', isComputed: false },
      ts_pct: { column: 'true_shooting_pct', isComputed: false },
      effective_fg: { column: 'effective_fg_pct', isComputed: false },
      efg_pct: { column: 'effective_fg_pct', isComputed: false },
      usage: { column: 'usage_rate', isComputed: false },
      usage_rate: { column: 'usage_rate', isComputed: false },
      offensive_rating: { column: 'offensive_rating', isComputed: false },
      defensive_rating: { column: 'defensive_rating', isComputed: false },
      net_rating: { column: 'net_rating', isComputed: false },
      win_shares: { column: 'win_shares', isComputed: false },
      bpm: { column: 'box_plus_minus', isComputed: false },
      box_plus_minus: { column: 'box_plus_minus', isComputed: false },
      vorp: { column: 'value_over_replacement', isComputed: false }
    };

    const statConfig = statMap[stat] || { column: 'ppg', isComputed: false };

    // Build the query based on stat type
    let query: string;
    if (statConfig.isComputed) {
      // For computed stats (percentages), use the CASE expression and optional min attempts
      const attemptFilter = statConfig.minAttempts ? ` AND pss.${statConfig.minAttempts}` : '';
      query = `
        SELECT pss.player_id, p.first_name, p.last_name, p.position,
               t.name as team_name, t.abbreviation as team_abbrev,
               pss.games_played,
               ${statConfig.column} as stat_value
        FROM player_season_stats pss
        JOIN players p ON pss.player_id = p.id
        LEFT JOIN teams t ON pss.team_id = t.id
        WHERE pss.season_id = $1 AND pss.games_played >= 5${attemptFilter}
        ORDER BY ${statConfig.column} DESC NULLS LAST
        LIMIT $2
      `;
    } else {
      // For stored stats, use COALESCE to handle NULL values
      query = `
        SELECT pss.player_id, p.first_name, p.last_name, p.position,
               t.name as team_name, t.abbreviation as team_abbrev,
               pss.games_played,
               COALESCE(pss.${statConfig.column}, 0) as stat_value
        FROM player_season_stats pss
        JOIN players p ON pss.player_id = p.id
        LEFT JOIN teams t ON pss.team_id = t.id
        WHERE pss.season_id = $1 AND pss.games_played >= 5
        ORDER BY COALESCE(pss.${statConfig.column}, 0) DESC
        LIMIT $2
      `;
    }

    const result = await pool.query(query, [seasonId, limit]);

    // Return array directly for client compatibility
    res.json(result.rows);
  } catch (error) {
    console.error('League leaders error:', error);
    res.status(500).json({ error: 'Failed to fetch league leaders' });
  }
});

// Get player season stats
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season_id } = req.query;

    let query = `
      SELECT pss.*, p.first_name, p.last_name, p.position, t.name as team_name
      FROM player_season_stats pss
      JOIN players p ON pss.player_id = p.id
      LEFT JOIN teams t ON pss.team_id = t.id
      WHERE pss.player_id = $1
    `;

    const params: any[] = [playerId];

    if (season_id) {
      query += ` AND pss.season_id = $2`;
      params.push(season_id);
    }

    query += ` ORDER BY pss.season_id DESC`;

    const result = await pool.query(query, params);

    res.json({ stats: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

// Get player game log
router.get('/player/:playerId/games', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT pgs.*,
              g.home_team_id, g.away_team_id, g.home_score, g.away_score,
              ht.abbreviation as home_abbrev, at.abbreviation as away_abbrev,
              g.completed_at
       FROM player_game_stats pgs
       JOIN games g ON pgs.game_id = g.id
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE pgs.player_id = $1
       ORDER BY g.completed_at DESC
       LIMIT $2`,
      [playerId, limit]
    );

    res.json({ games: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game log' });
  }
});

// Get team season stats
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const seasonId = await getLatestSeasonId();

    const result = await pool.query(
      `SELECT tss.*, t.name, t.abbreviation
       FROM team_season_stats tss
       JOIN teams t ON tss.team_id = t.id
       WHERE tss.team_id = $1 AND tss.season_id = $2`,
      [teamId, seasonId]
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team stats' });
  }
});

// Get team rankings
router.get('/rankings', async (req, res) => {
  try {
    const seasonId = await getLatestSeasonId();

    if (!seasonId) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT tss.*, t.name, t.abbreviation, t.primary_color,
              COALESCE(tss.offensive_rating, 100) as offensive_rating,
              COALESCE(tss.defensive_rating, 100) as defensive_rating,
              COALESCE(tss.net_rating, 0) as net_rating,
              ROW_NUMBER() OVER (ORDER BY COALESCE(tss.offensive_rating, 100) DESC) as off_rank,
              ROW_NUMBER() OVER (ORDER BY COALESCE(tss.defensive_rating, 100) ASC) as def_rank,
              ROW_NUMBER() OVER (ORDER BY COALESCE(tss.net_rating, 0) DESC) as net_rank,
              ROW_NUMBER() OVER (ORDER BY COALESCE(tss.pace, 100) DESC) as pace_rank
       FROM team_season_stats tss
       JOIN teams t ON tss.team_id = t.id
       WHERE tss.season_id = $1
       ORDER BY COALESCE(tss.net_rating, 0) DESC`,
      [seasonId]
    );

    // Return array directly for client compatibility
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team rankings' });
  }
});

// Update player season stats after a game
router.post('/update/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    // Get game details
    const gameResult = await pool.query(
      `SELECT * FROM games WHERE id = $1`,
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    // Get all player stats from this game
    const playerStatsResult = await pool.query(
      `SELECT * FROM player_game_stats WHERE game_id = $1`,
      [gameId]
    );

    // Update each player's season totals
    for (const pgs of playerStatsResult.rows) {
      // Calculate game score
      const stats: BasicStats = {
        minutes: pgs.minutes,
        points: pgs.points,
        fgm: pgs.fgm,
        fga: pgs.fga,
        three_pm: pgs.three_pm,
        three_pa: pgs.three_pa,
        ftm: pgs.ftm,
        fta: pgs.fta,
        oreb: pgs.oreb,
        dreb: pgs.dreb,
        assists: pgs.assists,
        steals: pgs.steals,
        blocks: pgs.blocks,
        turnovers: pgs.turnovers,
        fouls: pgs.fouls
      };

      const gameScore = calculateGameScore(stats);

      // Update game stats with game score
      await pool.query(
        `UPDATE player_game_stats SET game_score = $1 WHERE id = $2`,
        [gameScore, pgs.id]
      );

      // Upsert player season stats
      await pool.query(
        `INSERT INTO player_season_stats
         (player_id, season_id, team_id, games_played, minutes, points, fgm, fga,
          three_pm, three_pa, ftm, fta, oreb, dreb, assists, steals, blocks, turnovers, fouls)
         VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (player_id, season_id) DO UPDATE SET
           games_played = player_season_stats.games_played + 1,
           minutes = player_season_stats.minutes + $4,
           points = player_season_stats.points + $5,
           fgm = player_season_stats.fgm + $6,
           fga = player_season_stats.fga + $7,
           three_pm = player_season_stats.three_pm + $8,
           three_pa = player_season_stats.three_pa + $9,
           ftm = player_season_stats.ftm + $10,
           fta = player_season_stats.fta + $11,
           oreb = player_season_stats.oreb + $12,
           dreb = player_season_stats.dreb + $13,
           assists = player_season_stats.assists + $14,
           steals = player_season_stats.steals + $15,
           blocks = player_season_stats.blocks + $16,
           turnovers = player_season_stats.turnovers + $17,
           fouls = player_season_stats.fouls + $18,
           updated_at = NOW()`,
        [pgs.player_id, game.season_id, pgs.team_id,
         pgs.minutes, pgs.points, pgs.fgm, pgs.fga,
         pgs.three_pm, pgs.three_pa, pgs.ftm, pgs.fta,
         pgs.oreb, pgs.dreb, pgs.assists, pgs.steals,
         pgs.blocks, pgs.turnovers, pgs.fouls]
      );
    }

    res.json({ message: 'Stats updated', players_updated: playerStatsResult.rows.length });
  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

// Recalculate all advanced stats for a season
router.post('/recalculate/:seasonId', async (req, res) => {
  try {
    const { seasonId } = req.params;

    // Get all player season stats
    const statsResult = await pool.query(
      `SELECT pss.*, t.id as team_id
       FROM player_season_stats pss
       LEFT JOIN teams t ON pss.team_id = t.id
       WHERE pss.season_id = $1`,
      [seasonId]
    );

    let updated = 0;

    for (const stats of statsResult.rows) {
      if (stats.games_played === 0) continue;

      // Calculate per-game averages
      const avgStats: BasicStats = {
        minutes: stats.minutes,
        points: stats.points,
        fgm: stats.fgm,
        fga: stats.fga,
        three_pm: stats.three_pm,
        three_pa: stats.three_pa,
        ftm: stats.ftm,
        fta: stats.fta,
        oreb: stats.oreb,
        dreb: stats.dreb,
        assists: stats.assists,
        steals: stats.steals,
        blocks: stats.blocks,
        turnovers: stats.turnovers,
        fouls: stats.fouls
      };

      const perGame = calculatePerGameAverages(avgStats, stats.games_played);

      // Calculate advanced stats
      const tsPct = calculateTrueShootingPct(stats.points, stats.fga, stats.fta);
      const efgPct = calculateEffectiveFgPct(stats.fgm, stats.three_pm, stats.fga);

      // Simplified PER calculation
      const per = calculatePER(avgStats, {
        minutes: stats.games_played * 48 * 5,
        fga: stats.fga * 5,
        fta: stats.fta * 5,
        oreb: stats.oreb * 5,
        dreb: stats.dreb * 5,
        turnovers: stats.turnovers * 5,
        possessions: stats.games_played * 100
      }, 100);

      // Update the record
      await pool.query(
        `UPDATE player_season_stats SET
           ppg = $1, rpg = $2, apg = $3, spg = $4, bpg = $5, mpg = $6,
           true_shooting_pct = $7, effective_fg_pct = $8, per = $9,
           updated_at = NOW()
         WHERE player_id = $10 AND season_id = $11`,
        [perGame.ppg, perGame.rpg, perGame.apg, perGame.spg, perGame.bpg, perGame.mpg,
         tsPct, efgPct, per, stats.player_id, seasonId]
      );

      updated++;
    }

    res.json({ message: 'Advanced stats recalculated', players_updated: updated });
  } catch (error) {
    console.error('Recalculate stats error:', error);
    res.status(500).json({ error: 'Failed to recalculate stats' });
  }
});

export default router;
