import { Router } from 'express';
import { pool } from '../db/pool';
import { authMiddleware } from '../auth';

const router = Router();

// Award type labels
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

// Get awards for a season
router.get('/', async (req, res) => {
  try {
    const seasonId = req.query.season_id as string;

    let query = `
      SELECT a.*,
             p.first_name, p.last_name, p.position,
             t.name as team_name, t.abbreviation as team_abbrev, t.primary_color
      FROM awards a
      JOIN players p ON a.player_id = p.id
      LEFT JOIN teams t ON a.team_id = t.id
      JOIN seasons s ON a.season_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (seasonId) {
      params.push(seasonId);
      query += ` AND a.season_id = $${params.length}`;
    } else {
      query += ` AND s.status != 'completed'`;
    }

    query += ` ORDER BY
      CASE a.award_type
        WHEN 'mvp' THEN 1
        WHEN 'fmvp' THEN 2
        WHEN 'dpoy' THEN 3
        WHEN 'roy' THEN 4
        WHEN 'mip' THEN 5
        WHEN '6moy' THEN 6
        WHEN 'scoring_leader' THEN 7
        WHEN 'rebounds_leader' THEN 8
        WHEN 'assists_leader' THEN 9
        WHEN 'steals_leader' THEN 10
        WHEN 'blocks_leader' THEN 11
        WHEN 'all_nba_1' THEN 12
        WHEN 'all_nba_2' THEN 13
        WHEN 'all_nba_3' THEN 14
        WHEN 'all_def_1' THEN 15
        WHEN 'all_def_2' THEN 16
        ELSE 99
      END`;

    const result = await pool.query(query, params);

    // Group awards by type
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

// Calculate and save awards for a season
router.post('/calculate', authMiddleware(true), async (req: any, res) => {
  try {
    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active franchise' });
    }

    const franchise = franchiseResult.rows[0];
    const seasonId = franchise.season_id;

    // Check if awards already calculated
    const existingAwards = await pool.query(
      'SELECT COUNT(*) FROM awards WHERE season_id = $1',
      [seasonId]
    );

    if (parseInt(existingAwards.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Awards already calculated for this season' });
    }

    // Get player season stats (need at least 20 games to qualify)
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
      WHERE g.season_id = $1 AND g.status = 'completed' AND g.is_playoff = false
      GROUP BY p.id, p.first_name, p.last_name, p.team_id, p.position, p.years_pro
      HAVING COUNT(ps.id) >= 20
      ORDER BY AVG(ps.points) DESC
    `, [seasonId]);

    const players = statsResult.rows;

    if (players.length === 0) {
      return res.status(400).json({ error: 'Not enough games played to calculate awards' });
    }

    const awards: any[] = [];

    // MVP - Highest PPG + RPG + APG composite score with team success factor
    const mvpCandidates = [...players].sort((a, b) => {
      const scoreA = parseFloat(a.ppg) * 2 + parseFloat(a.rpg) + parseFloat(a.apg) * 1.5;
      const scoreB = parseFloat(b.ppg) * 2 + parseFloat(b.rpg) + parseFloat(b.apg) * 1.5;
      return scoreB - scoreA;
    });
    if (mvpCandidates[0]) {
      awards.push({
        season_id: seasonId,
        award_type: 'mvp',
        player_id: mvpCandidates[0].player_id,
        team_id: mvpCandidates[0].team_id,
        stat_value: parseFloat(mvpCandidates[0].ppg),
      });
    }

    // DPOY - Highest defensive plays per game
    const dpoyCandidates = [...players].sort((a, b) => {
      const defA = (parseFloat(a.spg) + parseFloat(a.bpg)) * parseFloat(a.games_played);
      const defB = (parseFloat(b.spg) + parseFloat(b.bpg)) * parseFloat(b.games_played);
      return defB - defA;
    });
    if (dpoyCandidates[0]) {
      awards.push({
        season_id: seasonId,
        award_type: 'dpoy',
        player_id: dpoyCandidates[0].player_id,
        team_id: dpoyCandidates[0].team_id,
        stat_value: parseFloat(dpoyCandidates[0].spg) + parseFloat(dpoyCandidates[0].bpg),
      });
    }

    // 6MOY - Best bench scorer (non-starters with most points off bench)
    const sixthManCandidates = players
      .filter(p => p.bench_ppg && parseFloat(p.bench_ppg) > 0)
      .sort((a, b) => parseFloat(b.bench_ppg || '0') - parseFloat(a.bench_ppg || '0'));
    if (sixthManCandidates[0]) {
      awards.push({
        season_id: seasonId,
        award_type: '6moy',
        player_id: sixthManCandidates[0].player_id,
        team_id: sixthManCandidates[0].team_id,
        stat_value: parseFloat(sixthManCandidates[0].bench_ppg || '0'),
      });
    }

    // ROY - Best rookie (years_pro = 0)
    const rookies = players.filter(p => p.years_pro === 0);
    const royCandidates = [...rookies].sort((a, b) => {
      const scoreA = parseFloat(a.ppg) + parseFloat(a.rpg) + parseFloat(a.apg);
      const scoreB = parseFloat(b.ppg) + parseFloat(b.rpg) + parseFloat(b.apg);
      return scoreB - scoreA;
    });
    if (royCandidates[0]) {
      awards.push({
        season_id: seasonId,
        award_type: 'roy',
        player_id: royCandidates[0].player_id,
        team_id: royCandidates[0].team_id,
        stat_value: parseFloat(royCandidates[0].ppg),
      });
    }

    // Scoring Leader
    const scoringLeader = [...players].sort((a, b) => parseFloat(b.ppg) - parseFloat(a.ppg))[0];
    if (scoringLeader) {
      awards.push({
        season_id: seasonId,
        award_type: 'scoring_leader',
        player_id: scoringLeader.player_id,
        team_id: scoringLeader.team_id,
        stat_value: parseFloat(scoringLeader.ppg),
      });
    }

    // Rebounds Leader
    const reboundsLeader = [...players].sort((a, b) => parseFloat(b.rpg) - parseFloat(a.rpg))[0];
    if (reboundsLeader) {
      awards.push({
        season_id: seasonId,
        award_type: 'rebounds_leader',
        player_id: reboundsLeader.player_id,
        team_id: reboundsLeader.team_id,
        stat_value: parseFloat(reboundsLeader.rpg),
      });
    }

    // Assists Leader
    const assistsLeader = [...players].sort((a, b) => parseFloat(b.apg) - parseFloat(a.apg))[0];
    if (assistsLeader) {
      awards.push({
        season_id: seasonId,
        award_type: 'assists_leader',
        player_id: assistsLeader.player_id,
        team_id: assistsLeader.team_id,
        stat_value: parseFloat(assistsLeader.apg),
      });
    }

    // Steals Leader
    const stealsLeader = [...players].sort((a, b) => parseFloat(b.spg) - parseFloat(a.spg))[0];
    if (stealsLeader) {
      awards.push({
        season_id: seasonId,
        award_type: 'steals_leader',
        player_id: stealsLeader.player_id,
        team_id: stealsLeader.team_id,
        stat_value: parseFloat(stealsLeader.spg),
      });
    }

    // Blocks Leader
    const blocksLeader = [...players].sort((a, b) => parseFloat(b.bpg) - parseFloat(a.bpg))[0];
    if (blocksLeader) {
      awards.push({
        season_id: seasonId,
        award_type: 'blocks_leader',
        player_id: blocksLeader.player_id,
        team_id: blocksLeader.team_id,
        stat_value: parseFloat(blocksLeader.bpg),
      });
    }

    // All-NBA Teams (5 players each: 2 guards, 2 forwards, 1 center)
    const guards = players.filter(p => ['PG', 'SG'].includes(p.position));
    const forwards = players.filter(p => ['SF', 'PF'].includes(p.position));
    const centers = players.filter(p => p.position === 'C');

    const sortByScore = (a: any, b: any) => {
      const scoreA = parseFloat(a.ppg) * 2 + parseFloat(a.rpg) + parseFloat(a.apg) * 1.5;
      const scoreB = parseFloat(b.ppg) * 2 + parseFloat(b.rpg) + parseFloat(b.apg) * 1.5;
      return scoreB - scoreA;
    };

    guards.sort(sortByScore);
    forwards.sort(sortByScore);
    centers.sort(sortByScore);

    // First Team
    const firstTeam = [
      ...guards.slice(0, 2),
      ...forwards.slice(0, 2),
      ...centers.slice(0, 1),
    ];
    for (const player of firstTeam) {
      awards.push({
        season_id: seasonId,
        award_type: 'all_nba_1',
        player_id: player.player_id,
        team_id: player.team_id,
        stat_value: parseFloat(player.ppg),
      });
    }

    // Second Team
    const secondTeam = [
      ...guards.slice(2, 4),
      ...forwards.slice(2, 4),
      ...centers.slice(1, 2),
    ];
    for (const player of secondTeam) {
      awards.push({
        season_id: seasonId,
        award_type: 'all_nba_2',
        player_id: player.player_id,
        team_id: player.team_id,
        stat_value: parseFloat(player.ppg),
      });
    }

    // Third Team
    const thirdTeam = [
      ...guards.slice(4, 6),
      ...forwards.slice(4, 6),
      ...centers.slice(2, 3),
    ];
    for (const player of thirdTeam) {
      awards.push({
        season_id: seasonId,
        award_type: 'all_nba_3',
        player_id: player.player_id,
        team_id: player.team_id,
        stat_value: parseFloat(player.ppg),
      });
    }

    // All-Defensive Teams (based on steals + blocks)
    const defensivePlayers = [...players].sort((a, b) => {
      const defA = parseFloat(a.spg) + parseFloat(a.bpg);
      const defB = parseFloat(b.spg) + parseFloat(b.bpg);
      return defB - defA;
    });

    // All-Defensive First Team (top 5)
    for (const player of defensivePlayers.slice(0, 5)) {
      awards.push({
        season_id: seasonId,
        award_type: 'all_def_1',
        player_id: player.player_id,
        team_id: player.team_id,
        stat_value: parseFloat(player.spg) + parseFloat(player.bpg),
      });
    }

    // All-Defensive Second Team (6-10)
    for (const player of defensivePlayers.slice(5, 10)) {
      awards.push({
        season_id: seasonId,
        award_type: 'all_def_2',
        player_id: player.player_id,
        team_id: player.team_id,
        stat_value: parseFloat(player.spg) + parseFloat(player.bpg),
      });
    }

    // Insert all awards
    for (const award of awards) {
      await pool.query(
        `INSERT INTO awards (season_id, award_type, player_id, team_id, stat_value)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (season_id, award_type, player_id) DO NOTHING`,
        [award.season_id, award.award_type, award.player_id, award.team_id, award.stat_value]
      );
    }

    res.json({
      message: 'Awards calculated successfully',
      awards_count: awards.length,
      awards: awards.map(a => ({
        type: a.award_type,
        label: AWARD_LABELS[a.award_type],
      })),
    });
  } catch (error) {
    console.error('Calculate awards error:', error);
    res.status(500).json({ error: 'Failed to calculate awards' });
  }
});

// Set Finals MVP (called after playoffs complete)
router.post('/fmvp', authMiddleware(true), async (req: any, res) => {
  try {
    const { player_id } = req.body;

    if (!player_id) {
      return res.status(400).json({ error: 'player_id is required' });
    }

    const franchiseResult = await pool.query(
      `SELECT * FROM franchises WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    if (franchiseResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active franchise' });
    }

    const franchise = franchiseResult.rows[0];
    const seasonId = franchise.season_id;

    // Get player info
    const playerResult = await pool.query(
      'SELECT id, team_id FROM players WHERE id = $1',
      [player_id]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = playerResult.rows[0];

    // Insert FMVP award
    await pool.query(
      `INSERT INTO awards (season_id, award_type, player_id, team_id)
       VALUES ($1, 'fmvp', $2, $3)
       ON CONFLICT (season_id, award_type, player_id) DO NOTHING`,
      [seasonId, player.id, player.team_id]
    );

    res.json({ message: 'Finals MVP set successfully' });
  } catch (error) {
    console.error('Set FMVP error:', error);
    res.status(500).json({ error: 'Failed to set Finals MVP' });
  }
});

export default router;
