// Check for database locks
import { pool } from '../db/pool';

async function checkLocks() {
  console.log('=== DATABASE LOCK CHECK ===\n');

  // Check for idle in transaction connections
  const idleInTx = await pool.query(`
    SELECT pid, state, query, now() - xact_start as duration
    FROM pg_stat_activity
    WHERE state = 'idle in transaction'
    ORDER BY xact_start
  `);
  console.log('Idle in transaction:', idleInTx.rows.length);
  for (const row of idleInTx.rows) {
    console.log(`  PID ${row.pid}: ${row.duration} - ${row.query?.substring(0, 60)}...`);
  }

  // Check for active connections
  const active = await pool.query(`
    SELECT pid, state, query, now() - query_start as duration
    FROM pg_stat_activity
    WHERE state = 'active' AND pid != pg_backend_pid()
    ORDER BY query_start
  `);
  console.log('\nActive queries:', active.rows.length);
  for (const row of active.rows) {
    console.log(`  PID ${row.pid}: ${row.duration} - ${row.query?.substring(0, 60)}...`);
  }

  // Check for waiting locks
  const waiting = await pool.query(`
    SELECT pid, mode, granted, query
    FROM pg_locks l
    JOIN pg_stat_activity a ON l.pid = a.pid
    WHERE NOT granted
  `);
  console.log('\nWaiting for locks:', waiting.rows.length);
  for (const row of waiting.rows) {
    console.log(`  PID ${row.pid}: waiting for ${row.mode}`);
  }

  // Kill any stuck connections
  if (idleInTx.rows.length > 0) {
    console.log('\n=== KILLING STUCK CONNECTIONS ===');
    for (const row of idleInTx.rows) {
      console.log(`Killing PID ${row.pid}...`);
      await pool.query('SELECT pg_terminate_backend($1)', [row.pid]);
    }
    console.log('Done killing stuck connections');
  }

  await pool.end();
}

checkLocks().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
