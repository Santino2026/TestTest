import { Router } from 'express';
import { pool } from '../db/pool';
import { getLatestSeasonId, getUserActiveFranchise } from '../db/queries';
import { authMiddleware } from '../auth';
import {
  calculateTrueShootingPct,
  calculateEffectiveFgPct,
  calculatePER,
  calculateGameScore,
  calculatePerGameAverages,
  BasicStats
} from '../statistics';

const router = Router();

const STAT_MAP: Record<string, { column: string; isComputed: boolean; minAttempts?: string }> = {
  points: { column: 'CASE WHEN pss.games_played > 0 THEN pss.points::float / pss.games_played ELSE 0 END', isComputed: true },
  ppg: { column: 'CASE WHEN pss.games_played > 0 THEN pss.points::float / pss.games_played ELSE 0 END', isComputed: true },
  rebounds: { column: 'CASE WHEN pss.games_played > 0 THEN (pss.oreb + pss.dreb)::float / pss.games_played ELSE 0 END', isComputed: true },
  rpg: { column: 'CASE WHEN pss.games_played > 0 THEN (pss.oreb + pss.dreb)::float / pss.games_played ELSE 0 END', isComputed: true },
  assists: { column: 'CASE WHEN pss.games_played > 0 THEN pss.assists::float / pss.games_played ELSE 0 END', isComputed: true },
  apg: { column: 'CASE WHEN pss.games_played > 0 THEN pss.assists::float / pss.games_played ELSE 0 END', isComputed: true },
  steals: { column: 'CASE WHEN pss.games_played > 0 THEN pss.steals::float / pss.games_played ELSE 0 END', isComputed: true },
  spg: { column: 'CASE WHEN pss.games_played > 0 THEN pss.steals::float / pss.games_played ELSE 0 END', isComputed: true },
  blocks: { column: 'CASE WHEN pss.games_played > 0 THEN pss.blocks::float / pss.games_played ELSE 0 END', isComputed: true },
  bpg: { column: 'CASE WHEN pss.games_played > 0 THEN pss.blocks::float / pss.games_played ELSE 0 END', isComputed: true },
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

function buildLeadersQuery(statConfig: { column: string; isComputed: boolean; minAttempts?: string }): string {
  const attemptFilter = statConfig.minAttempts ? ` AND pss.${statConfig.minAttempts}` : '';
  const gamesColumn = 'pss.games_played';

  if (statConfig.isComputed) {
    return `SELECT pss.player_id, p.first_name, p.last_name, p.position,
             t.name as team_name, t.abbreviation as team_abbrev,
             ${gamesColumn} as games_played, ${statConfig.column.replace(/rgp\.games_played/g, gamesColumn)} as stat_value
      FROM player_season_stats pss
      JOIN players p ON pss.player_id = p.id
      LEFT JOIN teams t ON pss.team_id = t.id
      WHERE pss.season_id = $1 AND ${gamesColumn} >= 5${attemptFilter}
      ORDER BY ${statConfig.column.replace(/rgp\.games_played/g, gamesColumn)} DESC NULLS LAST
      LIMIT $2`;
  }

  return `SELECT pss.player_id, p.first_name, p.last_name, p.position,
           t.name as team_name, t.abbreviation as team_abbrev,
           ${gamesColumn} as games_played, COALESCE(pss.${statConfig.column}, 0) as stat_value
    FROM player_season_stats pss
    JOIN players p ON pss.player_id = p.id
    LEFT JOIN teams t ON pss.team_id = t.id
    WHERE pss.season_id = $1 AND ${gamesColumn} >= 5
    ORDER BY COALESCE(pss.${statConfig.column}, 0) DESC
    LIMIT $2`;
}

router.get('/leaders', authMiddleware(true), async (req: any, res) => {
  try {
    const stat = (req.query.stat as string) || (req.query.category as string) || 'points';
    const limit = parseInt(req.query.limit as string) || 20;

    const franchise = await getUserActiveFranchise(req.user.userId);
    const seasonId = franchise?.season_id || await getLatestSeasonId();
    if (!seasonId) {
      return res.json([]);
    }

    const statConfig = STAT_MAP[stat] || { column: 'ppg', isComputed: false };
    const query = buildLeadersQuery(statConfig);
    const result = await pool.query(query, [seasonId, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('League leaders error:', error);
    res.status(500).json({ error: 'Failed to fetch league leaders' });
  }
});

router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season_id } = req.query;
    const params: any[] = [playerId];

    let seasonFilter = '';
    if (season_id) {
      params.push(season_id);
      seasonFilter = ` AND pss.season_id = $2`;
    }

    const result = await pool.query(
      `SELECT pss.*, p.first_name, p.last_name, p.position, t.name as team_name
       FROM player_season_stats pss
       JOIN players p ON pss.player_id = p.id
       LEFT JOIN teams t ON pss.team_id = t.id
       WHERE pss.player_id = $1${seasonFilter}
       ORDER BY pss.season_id DESC`,
      params
    );

    res.json({ stats: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

router.get('/player/:playerId/games', async (req, res) => {
  try {
    const { playerId } = req.params;
    const limit = req.query.limit || 20;

    const result = await pool.query(
      `SELECT pgs.*, g.home_team_id, g.away_team_id, g.home_score, g.away_score,
              ht.abbreviation as home_abbrev, at.abbreviation as away_abbrev, g.completed_at
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

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team rankings' });
  }
});

function toBasicStats(pgs: any): BasicStats {
  return {
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
}

router.post('/update/game/:gameId', authMiddleware(true), async (req: any, res) => {
  try {
    const { gameId } = req.params;

    const [gameResult, playerStatsResult] = await Promise.all([
      pool.query('SELECT * FROM games WHERE id = $1', [gameId]),
      pool.query('SELECT * FROM player_game_stats WHERE game_id = $1', [gameId])
    ]);

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    for (const pgs of playerStatsResult.rows) {
      const gameScore = calculateGameScore(toBasicStats(pgs));

      await pool.query(
        'UPDATE player_game_stats SET game_score = $1 WHERE id = $2',
        [gameScore, pgs.id]
      );

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

router.post('/recalculate/:seasonId', authMiddleware(true), async (req: any, res) => {
  try {
    const { seasonId } = req.params;

    // First, sync games_played from actual player_game_stats records
    await pool.query(
      `UPDATE player_season_stats pss SET
         games_played = sub.actual_games
       FROM (
         SELECT pgs.player_id, pgs.team_id, COUNT(*) as actual_games
         FROM player_game_stats pgs
         JOIN games g ON pgs.game_id = g.id
         WHERE g.season_id = $1 AND g.is_playoff IS NOT TRUE
         GROUP BY pgs.player_id, pgs.team_id
       ) sub
       WHERE pss.player_id = sub.player_id AND pss.team_id = sub.team_id AND pss.season_id = $1
         AND pss.games_played != sub.actual_games`,
      [seasonId]
    );

    // Get team totals for PER calculation
    const teamTotalsResult = await pool.query(
      `SELECT team_id, games_played, wins, minutes, fgm, fga, fta, oreb, dreb, turnovers
       FROM team_season_stats WHERE season_id = $1`,
      [seasonId]
    );
    const teamTotals = new Map<string, any>();
    for (const row of teamTotalsResult.rows) {
      teamTotals.set(row.team_id, row);
    }

    const statsResult = await pool.query(
      `SELECT pss.*
       FROM player_season_stats pss
       WHERE pss.season_id = $1`,
      [seasonId]
    );

    let updated = 0;

    for (const stats of statsResult.rows) {
      if (stats.games_played === 0) continue;

      const basicStats = toBasicStats(stats);
      const perGame = calculatePerGameAverages(basicStats, stats.games_played);
      const tsPct = calculateTrueShootingPct(stats.points, stats.fga, stats.fta);
      const efgPct = calculateEffectiveFgPct(stats.fgm, stats.three_pm, stats.fga);

      const tt = teamTotals.get(stats.team_id);
      const teamMinutes = tt?.minutes || stats.games_played * 48 * 5;
      const teamFga = tt?.fga || stats.fga * 5;
      const teamFta = tt?.fta || stats.fta * 5;
      const teamOreb = tt?.oreb || stats.oreb * 5;
      const teamTurnovers = tt?.turnovers || stats.turnovers * 5;
      const teamGames = tt?.games_played || stats.games_played;

      const per = calculatePER(basicStats, {
        minutes: teamMinutes,
        fgm: tt?.fgm || stats.fgm * 5,
        fga: teamFga,
        fta: teamFta,
        oreb: teamOreb,
        dreb: tt?.dreb || stats.dreb * 5,
        turnovers: teamTurnovers,
        possessions: teamGames * 100
      }, 100);

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
