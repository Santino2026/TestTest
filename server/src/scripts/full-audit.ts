// Full system audit
import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { saveCompleteGameResult, GameResult } from '../services/gamePersistence';

interface AuditResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
}

const results: AuditResult[] = [];

function log(check: string, status: 'PASS' | 'FAIL' | 'WARN', details?: string) {
  results.push({ check, status, details });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  console.log(`${icon} ${check}${details ? `: ${details}` : ''}`);
}

async function audit() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('           FULL SYSTEM AUDIT');
  console.log('═══════════════════════════════════════════════════════\n');

  // ===== DATABASE HEALTH =====
  console.log('--- DATABASE HEALTH ---');

  // Check for stuck connections
  const stuckConns = await pool.query(`
    SELECT pid, state, query, now() - xact_start as duration
    FROM pg_stat_activity
    WHERE state = 'idle in transaction'
  `);
  if (stuckConns.rows.length === 0) {
    log('No stuck transactions', 'PASS');
  } else {
    log('Stuck transactions found', 'FAIL', `${stuckConns.rows.length} connections idle in transaction`);
    // Kill them
    for (const row of stuckConns.rows) {
      await pool.query('SELECT pg_terminate_backend($1)', [row.pid]);
      console.log(`  Killed PID ${row.pid}`);
    }
  }

  // Check connection count
  const connCount = await pool.query(`
    SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()
  `);
  const count = parseInt(connCount.rows[0].count);
  if (count < 20) {
    log('Connection count healthy', 'PASS', `${count} connections`);
  } else {
    log('High connection count', 'WARN', `${count} connections`);
  }

  // ===== DATA INTEGRITY =====
  console.log('\n--- DATA INTEGRITY ---');

  // Check teams
  const teams = await pool.query('SELECT COUNT(*) FROM teams');
  if (parseInt(teams.rows[0].count) === 30) {
    log('Teams count', 'PASS', '30 teams');
  } else {
    log('Teams count', 'FAIL', `${teams.rows[0].count} teams (expected 30)`);
  }

  // Check players per team
  const playersPerTeam = await pool.query(`
    SELECT t.name, COUNT(p.id) as player_count
    FROM teams t
    LEFT JOIN players p ON p.team_id = t.id
    GROUP BY t.id, t.name
    HAVING COUNT(p.id) < 10
  `);
  if (playersPerTeam.rows.length === 0) {
    log('All teams have 10+ players', 'PASS');
  } else {
    log('Teams with low roster', 'WARN', playersPerTeam.rows.map(r => `${r.name}: ${r.player_count}`).join(', '));
  }

  // Check franchise
  const franchise = await pool.query(`
    SELECT f.*, t.name as team_name
    FROM franchises f
    JOIN teams t ON f.team_id = t.id
    WHERE f.is_active = true
    LIMIT 1
  `);
  if (franchise.rows.length === 0) {
    log('Active franchise', 'WARN', 'No active franchise found');
  } else {
    const f = franchise.rows[0];
    log('Active franchise', 'PASS', `${f.team_name}, ${f.phase}, day ${f.current_day}`);

    // Check schedule for this franchise
    const schedule = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE is_preseason = true) as preseason,
        COUNT(*) FILTER (WHERE is_preseason = false) as regular
      FROM schedule
      WHERE season_id = $1
    `, [f.season_id]);
    const s = schedule.rows[0];

    const expectedPreseason = 120; // 15 games * 8 days
    const expectedRegular = 1230; // 30 teams * 82 games / 2

    if (parseInt(s.preseason) >= 100 && parseInt(s.preseason) <= 130) {
      log('Preseason schedule', 'PASS', `${s.preseason} games`);
    } else {
      log('Preseason schedule', 'FAIL', `${s.preseason} games (expected ~${expectedPreseason})`);
    }

    if (parseInt(s.regular) >= 1200 && parseInt(s.regular) <= 1250) {
      log('Regular season schedule', 'PASS', `${s.regular} games`);
    } else {
      log('Regular season schedule', 'FAIL', `${s.regular} games (expected ~${expectedRegular})`);
    }

    // Check standings
    const standings = await pool.query(`
      SELECT COUNT(*) FROM standings WHERE season_id = $1
    `, [f.season_id]);
    if (parseInt(standings.rows[0].count) === 30) {
      log('Standings entries', 'PASS', '30 teams');
    } else {
      log('Standings entries', 'FAIL', `${standings.rows[0].count} (expected 30)`);
    }

    // Check games for current day exist
    const seasonStart = new Date('2024-10-22');
    const gameDate = new Date(seasonStart);
    gameDate.setDate(gameDate.getDate() + f.current_day);
    const gameDateStr = gameDate.toISOString().split('T')[0];

    const todayGames = await pool.query(`
      SELECT COUNT(*) FROM schedule
      WHERE season_id = $1 AND game_date = $2 AND is_preseason = $3 AND status = 'scheduled'
    `, [f.season_id, gameDateStr, f.phase === 'preseason']);

    if (parseInt(todayGames.rows[0].count) > 0) {
      log('Games for current day', 'PASS', `${todayGames.rows[0].count} games on ${gameDateStr}`);
    } else {
      log('Games for current day', 'WARN', `No scheduled games on ${gameDateStr}`);
    }
  }

  // ===== SIMULATION TEST =====
  console.log('\n--- SIMULATION TEST ---');

  if (franchise.rows.length > 0) {
    const f = franchise.rows[0];
    const seasonStart = new Date('2024-10-22');
    const gameDate = new Date(seasonStart);
    gameDate.setDate(gameDate.getDate() + f.current_day);
    const gameDateStr = gameDate.toISOString().split('T')[0];

    const games = await pool.query(`
      SELECT s.*, ht.name as home_name, at.name as away_name
      FROM schedule s
      JOIN teams ht ON s.home_team_id = ht.id
      JOIN teams at ON s.away_team_id = at.id
      WHERE s.season_id = $1 AND s.game_date = $2 AND s.is_preseason = $3 AND s.status = 'scheduled'
      LIMIT 1
    `, [f.season_id, gameDateStr, f.phase === 'preseason']);

    if (games.rows.length > 0) {
      const game = games.rows[0];
      try {
        const start = Date.now();
        const homeTeam = await loadTeamForSimulation(game.home_team_id);
        const awayTeam = await loadTeamForSimulation(game.away_team_id);

        if (homeTeam.roster.length < 5) {
          log('Home team roster', 'FAIL', `${homeTeam.name} has only ${homeTeam.roster.length} players`);
        } else {
          log('Home team loaded', 'PASS', `${homeTeam.name}: ${homeTeam.roster.length} players`);
        }

        if (awayTeam.roster.length < 5) {
          log('Away team roster', 'FAIL', `${awayTeam.name} has only ${awayTeam.roster.length} players`);
        } else {
          log('Away team loaded', 'PASS', `${awayTeam.name}: ${awayTeam.roster.length} players`);
        }

        const simResult = simulateGame(homeTeam, awayTeam);
        const elapsed = Date.now() - start;

        log('Game simulation', 'PASS', `${awayTeam.name} ${simResult.away_score} - ${simResult.home_score} ${homeTeam.name} (${elapsed}ms)`);

        // Verify result structure
        if (simResult.quarters && simResult.quarters.length >= 4) {
          log('Quarter data', 'PASS', `${simResult.quarters.length} quarters`);
        } else {
          log('Quarter data', 'FAIL', `Missing quarter data`);
        }

        if (simResult.home_player_stats && simResult.home_player_stats.length > 0) {
          log('Player stats', 'PASS', `${simResult.home_player_stats.length + simResult.away_player_stats.length} player stat records`);
        } else {
          log('Player stats', 'FAIL', 'Missing player stats');
        }

      } catch (error: any) {
        log('Simulation', 'FAIL', error.message);
      }
    } else {
      log('Simulation test', 'WARN', 'No games available to test');
    }
  }

  // ===== API ENDPOINT TESTS =====
  console.log('\n--- API ENDPOINT SIMULATION ---');

  // Test that we can do full preseason day simulation
  if (franchise.rows.length > 0 && franchise.rows[0].phase === 'preseason') {
    const f = franchise.rows[0];
    const seasonStart = new Date('2024-10-22');
    const gameDate = new Date(seasonStart);
    gameDate.setDate(gameDate.getDate() + f.current_day);
    const gameDateStr = gameDate.toISOString().split('T')[0];

    try {
      const start = Date.now();
      const games = await pool.query(`
        SELECT s.*, ht.name as home_name, at.name as away_name
        FROM schedule s
        JOIN teams ht ON s.home_team_id = ht.id
        JOIN teams at ON s.away_team_id = at.id
        WHERE s.season_id = $1 AND s.game_date = $2 AND s.is_preseason = true AND s.status = 'scheduled'
      `, [f.season_id, gameDateStr]);

      let simulated = 0;
      for (const game of games.rows) {
        const homeTeam = await loadTeamForSimulation(game.home_team_id);
        const awayTeam = await loadTeamForSimulation(game.away_team_id);
        const simResult = simulateGame(homeTeam, awayTeam);

        // Save result
        const gameResult: GameResult = {
          id: simResult.id,
          home_team_id: simResult.home_team_id,
          away_team_id: simResult.away_team_id,
          home_score: simResult.home_score,
          away_score: simResult.away_score,
          winner_id: simResult.winner_id,
          is_overtime: simResult.is_overtime,
          overtime_periods: simResult.overtime_periods,
          quarters: simResult.quarters,
          home_stats: simResult.home_stats,
          away_stats: simResult.away_stats,
          home_player_stats: simResult.home_player_stats.map((ps: any) => ({ ...ps, player_id: ps.player_id })),
          away_player_stats: simResult.away_player_stats.map((ps: any) => ({ ...ps, player_id: ps.player_id }))
        };

        await saveCompleteGameResult(
          gameResult,
          f.season_id,
          { id: homeTeam.id, starters: homeTeam.starters },
          { id: awayTeam.id, starters: awayTeam.starters },
          false
        );

        await pool.query(
          `UPDATE schedule SET status = 'completed', game_id = $1 WHERE id = $2`,
          [simResult.id, game.id]
        );

        simulated++;
      }

      const elapsed = Date.now() - start;
      log('Full day simulation', 'PASS', `${simulated} games in ${elapsed}ms (${(elapsed/simulated).toFixed(0)}ms/game)`);

      // Advance day
      const newDay = f.current_day + 1;
      await pool.query(
        `UPDATE franchises SET current_day = $1, last_played_at = NOW() WHERE id = $2`,
        [newDay, f.id]
      );
      log('Day advanced', 'PASS', `Now on day ${newDay}`);

    } catch (error: any) {
      log('Full day simulation', 'FAIL', error.message);
      console.error(error.stack);
    }
  }

  // ===== SUMMARY =====
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('           AUDIT SUMMARY');
  console.log('═══════════════════════════════════════════════════════');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`\n✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log(`⚠ WARNINGS: ${warned}`);

  if (failed > 0) {
    console.log('\nFailed checks:');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`  - ${r.check}: ${r.details || ''}`);
    }
  }

  if (warned > 0) {
    console.log('\nWarnings:');
    for (const r of results.filter(r => r.status === 'WARN')) {
      console.log(`  - ${r.check}: ${r.details || ''}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  await pool.end();

  if (failed > 0) {
    process.exit(1);
  }
}

audit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
