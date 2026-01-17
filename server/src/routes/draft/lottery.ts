import { Router } from 'express';
import { pool } from '../../db/pool';
import { simulateLottery, getLotteryOdds, LotteryTeam } from '../../draft';
import { authMiddleware } from '../../auth';
import { getUserActiveFranchise } from '../../db/queries';

const router = Router();

router.get('/lottery/odds', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const standingsResult = await pool.query(
      `SELECT t.id, t.name, t.abbreviation, s.wins, s.losses
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
       ORDER BY s.wins ASC, s.losses DESC
       LIMIT 14`,
      [franchise.season_id]
    );

    const lotteryTeams = standingsResult.rows.map((t: any, idx: number) => ({
      team_id: t.id,
      team_name: t.name,
      abbreviation: t.abbreviation,
      record: `${t.wins}-${t.losses}`,
      odds_pct: getLotteryOdds(idx + 1)
    }));

    res.json(lotteryTeams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lottery odds' });
  }
});

router.post('/lottery/run', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) {
      return res.status(404).json({ error: 'No active franchise' });
    }

    const seasonId = franchise.season_id;

    const existingResult = await pool.query(
      'SELECT COUNT(*) FROM draft_lottery WHERE season_id = $1 AND post_lottery_position IS NOT NULL',
      [seasonId]
    );
    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Lottery already completed' });
    }

    const standingsResult = await pool.query(
      `SELECT t.id, t.name, s.wins, s.losses
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
       ORDER BY s.wins ASC, s.losses DESC
       LIMIT 14`,
      [seasonId]
    );

    const teams: LotteryTeam[] = standingsResult.rows.map((t: any, idx: number) => ({
      team_id: t.id,
      team_name: t.name,
      pre_lottery_position: idx + 1,
      lottery_odds: getLotteryOdds(idx + 1)
    }));

    const results = simulateLottery(teams);

    for (const result of results) {
      await pool.query(
        `INSERT INTO draft_lottery
         (season_id, team_id, pre_lottery_position, lottery_odds, post_lottery_position, lottery_win)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (season_id, team_id) DO UPDATE
         SET post_lottery_position = $5, lottery_win = $6`,
        [seasonId, result.team_id, result.pre_lottery_position,
         result.lottery_odds, result.post_lottery_position, result.lottery_win]
      );
    }

    const nonLotteryResult = await pool.query(
      `SELECT t.id
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       WHERE s.season_id = $1
         AND t.id NOT IN (SELECT team_id FROM draft_lottery WHERE season_id = $1)
       ORDER BY s.wins ASC, s.losses DESC`,
      [seasonId]
    );

    const sortedLottery = results.sort((a, b) => (a.post_lottery_position || 0) - (b.post_lottery_position || 0));
    const firstRoundOrder = sortedLottery.map(r => r.team_id).concat(nonLotteryResult.rows.map(row => row.id));

    for (let i = 0; i < firstRoundOrder.length; i++) {
      await pool.query(
        `INSERT INTO draft_picks (season_id, round, pick_number, original_team_id, current_team_id)
         VALUES ($1, 1, $2, $3, $3)
         ON CONFLICT (season_id, round, pick_number) DO UPDATE
         SET original_team_id = $3, current_team_id = $3`,
        [seasonId, i + 1, firstRoundOrder[i]]
      );
    }

    for (let i = 0; i < firstRoundOrder.length; i++) {
      await pool.query(
        `INSERT INTO draft_picks (season_id, round, pick_number, original_team_id, current_team_id)
         VALUES ($1, 2, $2, $3, $3)
         ON CONFLICT (season_id, round, pick_number) DO UPDATE
         SET original_team_id = $3, current_team_id = $3`,
        [seasonId, 31 + i, firstRoundOrder[firstRoundOrder.length - 1 - i]]
      );
    }

    res.json({
      message: 'Lottery completed',
      results: results.map(r => ({
        pick: r.post_lottery_position,
        team: r.team_name,
        moved_up: r.lottery_win,
        original_position: r.pre_lottery_position
      }))
    });
  } catch (error) {
    console.error('Lottery error:', error);
    res.status(500).json({ error: 'Failed to run lottery' });
  }
});

export default router;
