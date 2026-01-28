import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                        // Maximum connections in pool
  idleTimeoutMillis: 30000,       // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Fail connection attempt after 10s
  statement_timeout: 30000,       // Kill queries running > 30s
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Graceful shutdown
export async function closePool(): Promise<void> {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed');
}
