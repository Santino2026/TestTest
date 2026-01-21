import { Router } from 'express';
import { pool } from '../db/pool';
import { developPlayer, agePlayer, shouldRetire, DevelopmentResult } from '../development';
import { authMiddleware } from '../auth';
import { generateSchedule, generatePreseasonSchedule } from '../schedule/generator';
import { getUserActiveFranchise } from '../db/queries';
import { withTransaction, withAdvisoryLock, lockUserActiveFranchise } from '../db/transactions';
import { OFFSEASON_PHASES, OFFSEASON_PHASE_LABELS } from '../constants';

const router = Router();

const PLAYER_ATTRIBUTES = [
  'work_ethic', 'basketball_iq', 'speed', 'acceleration', 'vertical',
  'stamina', 'strength', 'lateral_quickness', 'hustle',
  'inside_scoring', 'close_shot', 'mid_range', 'three_point', 'free_throw',
  'layup', 'standing_dunk', 'driving_dunk', 'post_moves', 'post_control',
  'ball_handling', 'passing_accuracy', 'passing_vision', 'steal', 'block',
  'shot_iq', 'offensive_iq', 'passing_iq', 'defensive_iq',
  'help_defense_iq', 'offensive_consistency', 'defensive_consistency',
  'interior_defense', 'perimeter_defense', 'offensive_rebound', 'defensive_rebound'
] as const;

function buildPlayerAttributes(player: Record<string, any>): Record<string, number> {
  const attributes: Record<string, number> = {};
  for (const attr of PLAYER_ATTRIBUTES) {
    attributes[attr] = player[attr] ?? 60;
  }
  return attributes;
}

router.post('/offseason', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });

    const result = await withAdvisoryLock(`offseason-${franchise.id}`, async (client) => {
      const franchiseCheck = await client.query(
        `SELECT phase FROM franchises WHERE id = $1 FOR UPDATE`,
        [franchise.id]
      );
      if (franchiseCheck.rows[0]?.phase === 'offseason') {
        throw { status: 400, message: 'Offseason already processed' };
      }

      const playersResult = await client.query(
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
      const retiringPlayerIds: string[] = [];
      const playerUpdates: Array<{ id: string; age: number; overall: number }> = [];
      const attrChanges: Map<string, Array<{ playerId: string; change: number }>> = new Map();

      // First pass: calculate all changes without database calls
      for (const player of playersResult.rows) {
        if (shouldRetire(player.age, player.overall, player.years_pro || 0)) {
          retirements.push({
            player_id: player.id,
            player_name: `${player.first_name} ${player.last_name}`,
            age: player.age,
            overall: player.overall,
            years_pro: player.years_pro || 0
          });
          retiringPlayerIds.push(player.id);
          continue;
        }

        const newAge = agePlayer(player.age);
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
          attributes: buildPlayerAttributes(player)
        });
        developmentResults.push(devResult);
        playerUpdates.push({ id: player.id, age: newAge, overall: devResult.new_overall });

        // Collect attribute changes
        for (const [attr, change] of Object.entries(devResult.changes)) {
          if (change !== 0) {
            if (!attrChanges.has(attr)) {
              attrChanges.set(attr, []);
            }
            attrChanges.get(attr)!.push({ playerId: player.id, change });
          }
        }
      }

      // Batch update retiring players
      if (retiringPlayerIds.length > 0) {
        await client.query(
          `UPDATE players SET team_id = NULL WHERE id = ANY($1)`,
          [retiringPlayerIds]
        );
      }

      // Batch update player age/overall/years_pro
      if (playerUpdates.length > 0) {
        const updateValues = playerUpdates.map((p, i) =>
          `($${i * 3 + 1}::uuid, $${i * 3 + 2}::integer, $${i * 3 + 3}::integer)`
        ).join(', ');
        const updateParams = playerUpdates.flatMap(p => [p.id, p.age, p.overall]);

        await client.query(
          `UPDATE players p SET
             age = v.age,
             overall = v.overall,
             years_pro = COALESCE(p.years_pro, 0) + 1
           FROM (VALUES ${updateValues}) AS v(id, age, overall)
           WHERE p.id = v.id`,
          updateParams
        );
      }

      // Batch update attributes - one query per attribute that has changes
      for (const [attr, changes] of attrChanges) {
        if (changes.length === 0) continue;

        const caseStatements = changes.map((c, i) =>
          `WHEN player_id = $${i * 2 + 1} THEN GREATEST(30, LEAST(99, COALESCE(${attr}, 60) + $${i * 2 + 2}))`
        ).join(' ');
        const params = changes.flatMap(c => [c.playerId, c.change]);
        const playerIds = changes.map(c => c.playerId);

        await client.query(
          `UPDATE player_attributes SET ${attr} = CASE ${caseStatements} ELSE ${attr} END
           WHERE player_id = ANY($${params.length + 1})`,
          [...params, playerIds]
        );
      }

      await client.query(
        `UPDATE contracts SET years_remaining = years_remaining - 1, updated_at = NOW()
         WHERE status = 'active' AND years_remaining > 0`
      );
      await client.query(
        `UPDATE contracts SET status = 'expired', updated_at = NOW()
         WHERE status = 'active' AND years_remaining <= 0`
      );

      const expiredContracts = await client.query(
        `SELECT c.player_id, c.annual_salary, p.overall
         FROM contracts c
         JOIN players p ON c.player_id = p.id
         WHERE c.status = 'expired' AND c.updated_at > NOW() - INTERVAL '1 minute'`
      );

      for (const row of expiredContracts.rows) {
        await client.query(`UPDATE players SET team_id = NULL, salary = 0 WHERE id = $1`, [row.player_id]);
        await client.query(
          `INSERT INTO free_agents (player_id, previous_team_id, asking_salary, market_value, status)
           VALUES ($1, (SELECT team_id FROM contracts WHERE player_id = $1 ORDER BY created_at DESC LIMIT 1), $2, $3, 'available')
           ON CONFLICT (player_id) DO UPDATE SET status = 'available', asking_salary = $2`,
          [row.player_id, row.annual_salary || 5000000, (row.overall || 70) * 100000]
        );
      }

      await client.query(
        `UPDATE franchises SET phase = 'offseason', offseason_phase = 'review', last_played_at = NOW() WHERE id = $1`,
        [franchise.id]
      );

      const improved = developmentResults.filter(r => r.new_overall > r.previous_overall).length;
      const declined = developmentResults.filter(r => r.new_overall < r.previous_overall).length;

      return {
        message: 'Offseason processed',
        summary: {
          total_players: developmentResults.length,
          improved,
          declined,
          unchanged: developmentResults.length - improved - declined,
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
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Offseason error:', error);
    res.status(500).json({ error: 'Failed to process offseason' });
  }
});

router.post('/finalize-playoffs', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });
    if (franchise.phase !== 'playoffs') return res.status(400).json({ error: 'Not in playoffs phase' });

    const finalsResult = await pool.query(
      `SELECT winner_id FROM playoff_series WHERE season_id = $1 AND round = 4 AND status = 'completed'`,
      [franchise.season_id]
    );
    if (finalsResult.rows.length === 0) return res.status(400).json({ error: 'Playoffs not complete yet' });

    const champion = finalsResult.rows[0].winner_id;
    if (!champion) return res.status(400).json({ error: 'Finals completed but no winner determined' });

    const userIsChampion = champion === franchise.team_id;

    await withTransaction(async (client) => {
      if (userIsChampion) {
        await client.query(`UPDATE teams SET championships = championships + 1 WHERE id = $1`, [franchise.team_id]);
        await client.query(`UPDATE franchises SET championships = championships + 1 WHERE id = $1`, [franchise.id]);
      }
      await client.query(
        `UPDATE franchises SET phase = 'offseason', offseason_phase = 'review', last_played_at = NOW() WHERE id = $1`,
        [franchise.id]
      );
      await client.query(`UPDATE seasons SET status = 'offseason' WHERE id = $1`, [franchise.season_id]);
    });

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

const ROUND_NAMES: Record<number, string> = {
  0: 'Play-In Tournament',
  1: 'First Round',
  2: 'Conference Semifinals',
  3: 'Conference Finals',
  4: 'NBA Finals'
};

function getPlayoffFinish(series: any, teamId: string): string {
  if (!series) return 'Did not make playoffs';
  const userWon = series.winner_id === teamId;
  if (userWon && series.round === 4) return 'CHAMPIONS!';
  if (userWon) return `Won ${ROUND_NAMES[series.round]}`;
  return `Lost in ${ROUND_NAMES[series.round]}`;
}

router.get('/summary', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });

    const [finalsResult, userStandingsResult, userPlayoffResult, topStandingsResult] = await Promise.all([
      pool.query(
        `SELECT ps.*, ht.name as higher_seed_name, ht.abbreviation as higher_abbrev, ht.city as higher_city,
                lt.name as lower_seed_name, lt.abbreviation as lower_abbrev, lt.city as lower_city,
                wt.name as winner_name, wt.abbreviation as winner_abbrev, wt.city as winner_city, wt.id as winner_id
         FROM playoff_series ps
         JOIN teams ht ON ps.higher_seed_id = ht.id
         JOIN teams lt ON ps.lower_seed_id = lt.id
         LEFT JOIN teams wt ON ps.winner_id = wt.id
         WHERE ps.season_id = $1 AND ps.round = 4`,
        [franchise.season_id]
      ),
      pool.query(
        `SELECT s.wins, s.losses, t.name, t.abbreviation, t.conference
         FROM standings s JOIN teams t ON s.team_id = t.id
         WHERE s.season_id = $1 AND s.team_id = $2`,
        [franchise.season_id, franchise.team_id]
      ),
      pool.query(
        `SELECT ps.round, ps.winner_id FROM playoff_series ps
         WHERE ps.season_id = $1 AND (ps.higher_seed_id = $2 OR ps.lower_seed_id = $2)
         ORDER BY ps.round DESC LIMIT 1`,
        [franchise.season_id, franchise.team_id]
      ),
      pool.query(
        `SELECT s.wins, s.losses, t.name, t.abbreviation, t.conference
         FROM standings s JOIN teams t ON s.team_id = t.id
         WHERE s.season_id = $1 ORDER BY s.wins DESC LIMIT 8`,
        [franchise.season_id]
      )
    ]);

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

    const userRecord = userStandingsResult.rows[0] || null;

    res.json({
      season_number: franchise.season_number || 1,
      champion,
      user_team: {
        name: userRecord?.name,
        abbreviation: userRecord?.abbreviation,
        wins: userRecord?.wins || 0,
        losses: userRecord?.losses || 0,
        playoff_finish: getPlayoffFinish(userPlayoffResult.rows[0], franchise.team_id),
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

router.get('/offseason', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });
    if (franchise.phase !== 'offseason') return res.status(400).json({ error: 'Not in offseason' });

    const offseasonPhase = (franchise.offseason_phase || 'review') as typeof OFFSEASON_PHASES[number];
    const currentIndex = OFFSEASON_PHASES.indexOf(offseasonPhase);

    res.json({
      phase: 'offseason',
      offseason_phase: offseasonPhase,
      next_phase: currentIndex < OFFSEASON_PHASES.length - 1 ? OFFSEASON_PHASES[currentIndex + 1] : null,
      can_start_new_season: offseasonPhase === 'training_camp'
    });
  } catch (error) {
    console.error('Get offseason state error:', error);
    res.status(500).json({ error: 'Failed to get offseason state' });
  }
});

router.post('/offseason/advance', authMiddleware(true), async (req: any, res) => {
  try {
    const result = await withTransaction(async (client) => {
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) throw { status: 404, message: 'No franchise found' };
      if (franchise.phase !== 'offseason') throw { status: 400, message: 'Not in offseason' };

      const currentPhase = (franchise.offseason_phase || 'review') as typeof OFFSEASON_PHASES[number];
      const currentIndex = OFFSEASON_PHASES.indexOf(currentPhase);
      if (currentIndex >= OFFSEASON_PHASES.length - 1) {
        throw { status: 400, message: 'Already at final offseason phase. Start new season.' };
      }

      const nextPhase = OFFSEASON_PHASES[currentIndex + 1];
      await client.query(
        `UPDATE franchises SET offseason_phase = $1, last_played_at = NOW() WHERE id = $2`,
        [nextPhase, franchise.id]
      );

      return {
        message: `Advanced to ${OFFSEASON_PHASE_LABELS[nextPhase]}`,
        previous_phase: currentPhase,
        offseason_phase: nextPhase,
        phase_label: OFFSEASON_PHASE_LABELS[nextPhase],
        can_start_new_season: nextPhase === 'training_camp'
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Advance offseason phase error:', error);
    res.status(500).json({ error: 'Failed to advance offseason phase' });
  }
});

router.post('/offseason/skip-to', authMiddleware(true), async (req: any, res) => {
  try {
    const { target_phase } = req.body;
    if (!OFFSEASON_PHASES.includes(target_phase)) {
      return res.status(400).json({ error: 'Invalid target phase' });
    }

    const result = await withTransaction(async (client) => {
      const franchise = await lockUserActiveFranchise(client, req.user.userId);
      if (!franchise) throw { status: 404, message: 'No franchise found' };
      if (franchise.phase !== 'offseason') throw { status: 400, message: 'Not in offseason' };

      // Only allow skipping forward, not backward
      const currentPhase = franchise.offseason_phase || 'review';
      const currentIndex = OFFSEASON_PHASES.indexOf(currentPhase);
      const targetIndex = OFFSEASON_PHASES.indexOf(target_phase);
      if (targetIndex <= currentIndex) {
        throw { status: 400, message: 'Can only skip forward to a later phase' };
      }

      await client.query(
        `UPDATE franchises SET offseason_phase = $1, last_played_at = NOW() WHERE id = $2`,
        [target_phase, franchise.id]
      );

      const label = OFFSEASON_PHASE_LABELS[target_phase as keyof typeof OFFSEASON_PHASE_LABELS];
      return {
        message: `Skipped to ${label}`,
        offseason_phase: target_phase,
        phase_label: label,
        can_start_new_season: target_phase === 'training_camp'
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Skip to offseason phase error:', error);
    res.status(500).json({ error: 'Failed to skip to phase' });
  }
});

router.post('/new', authMiddleware(true), async (req: any, res) => {
  try {
    const franchise = await getUserActiveFranchise(req.user.userId);
    if (!franchise) return res.status(404).json({ error: 'No franchise found' });
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

    const newSeasonNumber = (franchise.season_number || 0) + 1;

    const newSeasonId = await pool.query(
      `INSERT INTO seasons (season_number, status) VALUES ($1, 'preseason') RETURNING id`,
      [newSeasonNumber]
    );
    const newSeason = newSeasonId.rows[0];

    const teamsResult = await pool.query('SELECT id, conference, division FROM teams');
    const teams = teamsResult.rows;

    for (const t of teams) {
      await pool.query(
        `INSERT INTO standings (season_id, team_id, wins, losses, home_wins, home_losses,
         away_wins, away_losses, conference_wins, conference_losses, division_wins, division_losses,
         points_for, points_against, streak, last_10_wins)
         VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
         ON CONFLICT (season_id, team_id) DO NOTHING`,
        [newSeason.id, t.id]
      );
    }

    const allGames = [
      ...generatePreseasonSchedule(teams).map(g => ({ ...g, is_preseason: true })),
      ...generateSchedule(teams).map(g => ({ ...g, is_preseason: false }))
    ];

    const batchSize = 100;
    for (let i = 0; i < allGames.length; i += batchSize) {
      const batch = allGames.slice(i, i + batchSize);
      const values: any[] = [];
      const placeholders: string[] = [];

      batch.forEach((game, idx) => {
        const isUserGame = game.home_team_id === franchise.team_id || game.away_team_id === franchise.team_id;
        const offset = idx * 8;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
        values.push(newSeason.id, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame, game.is_preseason, game.game_day);
      });

      await pool.query(
        `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason, game_day)
         VALUES ${placeholders.join(', ')}`,
        values
      );
    }

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
