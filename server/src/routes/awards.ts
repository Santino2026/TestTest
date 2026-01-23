import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';
import { getUserActiveFranchise } from '../db/queries';
import { withTransaction } from '../db/transactions';

const router = Router();

const AWARD_LABELS: Record<string, string> = {
  mvp: 'Most Valuable Player',
  dpoy: 'Defensive Player of the Year',
  '6moy': 'Sixth Man of the Year',
  roy: 'Rookie of the Year',
  mip: 'Most Improved Player',
  fmvp: 'Finals MVP',
  all_nba_1: 'All-NBA First Team',
  all_nba_2: 'All-NBA Second Team',
  all_nba_3: 'All-NBA Third Team',
  all_def_1: 'All-Defensive First Team',
  all_def_2: 'All-Defensive Second Team',
  scoring_leader: 'Scoring Champion',
  assists_leader: 'Assists Leader',
  rebounds_leader: 'Rebounds Leader',
  steals_leader: 'Steals Leader',
  blocks_leader: 'Blocks Leader',
};

const AWARD_ORDER = [
  'mvp', 'fmvp', 'dpoy', 'roy', 'mip', '6moy',
  'scoring_leader', 'rebounds_leader', 'assists_leader', 'steals_leader', 'blocks_leader',
  'all_nba_1', 'all_nba_2', 'all_nba_3', 'all_def_1', 'all_def_2'
];

function createAward(seasonId: string, type: string, player: any, statValue: number): any {
  return {
    season_id: seasonId,
    award_type: type,
    player_id: player.player_id,
    team_id: player.team_id,
    stat_value: statValue,
  };
}

function compositeScore(player: any): number {
  return parseFloat(player.ppg) * 2 + parseFloat(player.rpg) + parseFloat(player.apg) * 1.5;
}

function defensiveScore(player: any): number {
  return parseFloat(player.spg) + parseFloat(player.bpg);
}

router.get('/', async (req, res) => {
  try {
    const seasonId = req.query.season_id as string;
    const params: any[] = [];

    let whereClause = '';
    if (seasonId) {
      params.push(seasonId);
      whereClause = `AND a.season_id = $${params.length}`;
    } else {
      whereClause = `AND s.status != 'completed'`;
    }

    const orderCase = AWARD_ORDER.map((type, i) => `WHEN '${type}' THEN ${i + 1}`).join(' ');

    const result = await pool.query(`
      SELECT a.*,
             p.first_name, p.last_name, p.position,
             t.name as team_name, t.abbreviation as team_abbrev, t.primary_color
      FROM awards a
      JOIN players p ON a.player_id = p.id
      LEFT JOIN teams t ON a.team_id = t.id
      JOIN seasons s ON a.season_id = s.id
      WHERE 1=1 ${whereClause}
      ORDER BY CASE a.award_type ${orderCase} ELSE 99 END
    `, params);

    const groupedAwards: Record<string, any[]> = {};
    for (const award of result.rows) {
      const type = award.award_type;
      if (!groupedAwards[type]) {
        groupedAwards[type] = [];
      }
      groupedAwards[type].push({
        ...award,
        label: AWARD_LABELS[type] || type,
      });
    }

    res.json(groupedAwards);
  } catch (error) {
    console.error('Get awards error:', error);
    res.status(500).json({ error: 'Failed to fetch awards' });
  }
});

router.post('/calculate', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(400).json({ error: 'No active franchise' });
    }

    const seasonId = franchise.season_id;

    const existingAwards = await pool.query(
      'SELECT COUNT(*) FROM awards WHERE season_id = $1',
      [seasonId]
    );
    if (parseInt(existingAwards.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Awards already calculated for this season' });
    }

    const statsResult = await pool.query(`
      SELECT
        p.id as player_id,
        p.first_name,
        p.last_name,
        p.team_id,
        p.position,
        p.years_pro,
        COUNT(ps.id) as games_played,
        SUM(ps.minutes) as total_minutes,
        AVG(ps.points) as ppg,
        AVG(ps.rebounds) as rpg,
        AVG(ps.assists) as apg,
        AVG(ps.steals) as spg,
        AVG(ps.blocks) as bpg,
        AVG(ps.minutes) as mpg,
        AVG(CASE WHEN ps.is_starter = false THEN ps.points ELSE NULL END) as bench_ppg,
        SUM(ps.steals + ps.blocks) as defensive_plays
      FROM players p
      JOIN player_game_stats ps ON p.id = ps.player_id
      JOIN games g ON ps.game_id = g.id
      WHERE g.season_id = $1 AND g.status = 'completed' AND g.is_playoff IS NOT TRUE
      GROUP BY p.id, p.first_name, p.last_name, p.team_id, p.position, p.years_pro
      HAVING COUNT(ps.id) >= 20
      ORDER BY AVG(ps.points) DESC
    `, [seasonId]);

    const players = statsResult.rows;
    if (players.length === 0) {
      return res.status(400).json({ error: 'Not enough games played to calculate awards' });
    }

    const awards: any[] = [];

    // MVP
    const mvpWinner = [...players].sort((a, b) => compositeScore(b) - compositeScore(a))[0];
    if (mvpWinner) {
      awards.push(createAward(seasonId, 'mvp', mvpWinner, parseFloat(mvpWinner.ppg)));
    }

    // DPOY
    const dpoyWinner = [...players].sort((a, b) => {
      const defA = defensiveScore(a) * parseFloat(a.games_played);
      const defB = defensiveScore(b) * parseFloat(b.games_played);
      return defB - defA;
    })[0];
    if (dpoyWinner) {
      awards.push(createAward(seasonId, 'dpoy', dpoyWinner, defensiveScore(dpoyWinner)));
    }

    // 6MOY
    const sixthManWinner = players
      .filter(p => p.bench_ppg && parseFloat(p.bench_ppg) > 0)
      .sort((a, b) => parseFloat(b.bench_ppg || '0') - parseFloat(a.bench_ppg || '0'))[0];
    if (sixthManWinner) {
      awards.push(createAward(seasonId, '6moy', sixthManWinner, parseFloat(sixthManWinner.bench_ppg)));
    }

    // ROY
    const rookies = players.filter(p => p.years_pro === 0);
    const royWinner = [...rookies].sort((a, b) => {
      const scoreA = parseFloat(a.ppg) + parseFloat(a.rpg) + parseFloat(a.apg);
      const scoreB = parseFloat(b.ppg) + parseFloat(b.rpg) + parseFloat(b.apg);
      return scoreB - scoreA;
    })[0];
    if (royWinner) {
      awards.push(createAward(seasonId, 'roy', royWinner, parseFloat(royWinner.ppg)));
    }

    // MIP
    const prevSeasonResult = await pool.query(
      `SELECT id FROM seasons WHERE season_number < (SELECT season_number FROM seasons WHERE id = $1) ORDER BY season_number DESC LIMIT 1`,
      [seasonId]
    );
    const prevSeasonId = prevSeasonResult.rows[0]?.id;

    if (prevSeasonId) {
      const improvementResult = await pool.query(`
        WITH current_stats AS (
          SELECT pgs.player_id, AVG(pgs.points) as ppg, AVG(pgs.rebounds) as rpg, AVG(pgs.assists) as apg
          FROM player_game_stats pgs
          JOIN games g ON pgs.game_id = g.id
          WHERE g.season_id = $1 AND g.status = 'completed' AND g.is_playoff IS NOT TRUE
          GROUP BY pgs.player_id HAVING COUNT(*) >= 20
        ),
        prev_stats AS (
          SELECT pgs.player_id, AVG(pgs.points) as ppg, AVG(pgs.rebounds) as rpg, AVG(pgs.assists) as apg
          FROM player_game_stats pgs
          JOIN games g ON pgs.game_id = g.id
          WHERE g.season_id = $2 AND g.status = 'completed' AND g.is_playoff IS NOT TRUE
          GROUP BY pgs.player_id HAVING COUNT(*) >= 20
        )
        SELECT p.id as player_id, p.team_id, (c.ppg - pr.ppg) as ppg_improvement
        FROM players p
        JOIN current_stats c ON p.id = c.player_id
        JOIN prev_stats pr ON p.id = pr.player_id
        WHERE p.years_pro > 0
        ORDER BY (c.ppg - pr.ppg) + (c.rpg - pr.rpg) * 0.5 + (c.apg - pr.apg) * 0.5 DESC
        LIMIT 1
      `, [seasonId, prevSeasonId]);

      const mipWinner = improvementResult.rows[0];
      if (mipWinner && parseFloat(mipWinner.ppg_improvement) > 0) {
        awards.push(createAward(seasonId, 'mip', mipWinner, parseFloat(mipWinner.ppg_improvement)));
      }
    }

    // Stat leaders
    const statLeaders = [
      { type: 'scoring_leader', stat: 'ppg' },
      { type: 'rebounds_leader', stat: 'rpg' },
      { type: 'assists_leader', stat: 'apg' },
      { type: 'steals_leader', stat: 'spg' },
      { type: 'blocks_leader', stat: 'bpg' },
    ];

    for (const { type, stat } of statLeaders) {
      const leader = [...players].sort((a, b) => parseFloat(b[stat]) - parseFloat(a[stat]))[0];
      if (leader) {
        awards.push(createAward(seasonId, type, leader, parseFloat(leader[stat])));
      }
    }

    // All-NBA Teams
    const guards = players.filter(p => ['PG', 'SG'].includes(p.position)).sort((a, b) => compositeScore(b) - compositeScore(a));
    const forwards = players.filter(p => ['SF', 'PF'].includes(p.position)).sort((a, b) => compositeScore(b) - compositeScore(a));
    const centers = players.filter(p => p.position === 'C').sort((a, b) => compositeScore(b) - compositeScore(a));

    // Validate minimum players for All-NBA teams
    if (guards.length < 6 || forwards.length < 6 || centers.length < 3) {
      console.warn(`Insufficient players for All-NBA teams: ${guards.length} guards, ${forwards.length} forwards, ${centers.length} centers`);
    }

    const allNbaTeams = [
      { type: 'all_nba_1', guards: guards.slice(0, 2), forwards: forwards.slice(0, 2), centers: centers.slice(0, 1) },
      { type: 'all_nba_2', guards: guards.slice(2, 4), forwards: forwards.slice(2, 4), centers: centers.slice(1, 2) },
      { type: 'all_nba_3', guards: guards.slice(4, 6), forwards: forwards.slice(4, 6), centers: centers.slice(2, 3) },
    ];

    for (const team of allNbaTeams) {
      const teamPlayers = [...team.guards, ...team.forwards, ...team.centers].filter(Boolean);
      for (const player of teamPlayers) {
        awards.push(createAward(seasonId, team.type, player, parseFloat(player.ppg)));
      }
    }

    // All-Defensive Teams
    const defensivePlayers = [...players].sort((a, b) => defensiveScore(b) - defensiveScore(a));
    for (const player of defensivePlayers.slice(0, 5)) {
      awards.push(createAward(seasonId, 'all_def_1', player, defensiveScore(player)));
    }
    for (const player of defensivePlayers.slice(5, 10)) {
      awards.push(createAward(seasonId, 'all_def_2', player, defensiveScore(player)));
    }

    await withTransaction(async (client) => {
      const existingCheck = await client.query(
        'SELECT COUNT(*) FROM awards WHERE season_id = $1',
        [seasonId]
      );
      if (parseInt(existingCheck.rows[0].count) > 0) {
        throw { status: 400, message: 'Awards already calculated for this season' };
      }

      for (const award of awards) {
        await client.query(
          `INSERT INTO awards (season_id, award_type, player_id, team_id, stat_value)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (season_id, award_type, player_id) DO NOTHING`,
          [award.season_id, award.award_type, award.player_id, award.team_id, award.stat_value]
        );
      }
    });

    res.json({
      message: 'Awards calculated successfully',
      awards_count: awards.length,
      awards: awards.map(a => ({ type: a.award_type, label: AWARD_LABELS[a.award_type] })),
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Calculate awards error:', error);
    res.status(500).json({ error: 'Failed to calculate awards' });
  }
});

router.post('/fmvp', authMiddleware(true), async (req: any, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) {
      return res.status(400).json({ error: 'player_id is required' });
    }

    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(400).json({ error: 'No active franchise' });
    }

    const playerResult = await pool.query(
      'SELECT id, team_id FROM players WHERE id = $1',
      [player_id]
    );
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = playerResult.rows[0];

    await pool.query(
      `INSERT INTO awards (season_id, award_type, player_id, team_id)
       VALUES ($1, 'fmvp', $2, $3)
       ON CONFLICT (season_id, award_type, player_id) DO NOTHING`,
      [franchise.season_id, player.id, player.team_id]
    );

    res.json({ message: 'Finals MVP set successfully' });
  } catch (error) {
    console.error('Set FMVP error:', error);
    res.status(500).json({ error: 'Failed to set Finals MVP' });
  }
});

export default router;
