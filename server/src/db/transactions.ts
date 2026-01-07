import { pool } from './pool';
import { PoolClient } from 'pg';

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION UTILITIES
// Provides atomic database operations to prevent race conditions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute a function within a database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('UPDATE ...', [...]);
 *   await client.query('INSERT ...', [...]);
 *   return someValue;
 * });
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Acquire a row-level lock using SELECT FOR UPDATE.
 * Use this to prevent concurrent modifications to the same row.
 *
 * @example
 * const franchise = await lockRow(client, 'franchises', franchiseId);
 * if (!franchise) throw new Error('Not found');
 * // Now safe to modify this franchise
 */
export async function lockRow<T>(
  client: PoolClient,
  table: string,
  id: string,
  columns: string = '*'
): Promise<T | null> {
  const result = await client.query(
    `SELECT ${columns} FROM ${table} WHERE id = $1 FOR UPDATE`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Lock franchise row for exclusive access during updates.
 * Prevents race conditions in season advancement, etc.
 */
export async function lockFranchise(
  client: PoolClient,
  franchiseId: string
): Promise<any | null> {
  const result = await client.query(
    `SELECT f.*, t.name as team_name, t.abbreviation, t.city, t.conference, t.division,
            s.wins, s.losses
     FROM franchises f
     JOIN teams t ON f.team_id = t.id
     LEFT JOIN standings s ON s.team_id = f.team_id AND s.season_id = f.season_id
     WHERE f.id = $1
     FOR UPDATE OF f`,
    [franchiseId]
  );
  return result.rows[0] || null;
}

/**
 * Lock user's active franchise for exclusive access.
 */
export async function lockUserActiveFranchise(
  client: PoolClient,
  userId: string
): Promise<any | null> {
  const result = await client.query(
    `SELECT f.*, t.name as team_name, t.abbreviation, t.city, t.conference, t.division,
            s.wins, s.losses
     FROM franchises f
     JOIN teams t ON f.team_id = t.id
     LEFT JOIN standings s ON s.team_id = f.team_id AND s.season_id = f.season_id
     WHERE f.user_id = $1 AND f.is_active = TRUE
     FOR UPDATE OF f`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Atomic update with condition check - returns updated row or null if condition not met.
 * Use for operations like "sign player only if still available".
 *
 * @example
 * const player = await atomicUpdate(client, 'players',
 *   { team_id: teamId, salary: salary },
 *   { id: playerId, team_id: null }  // Only if team_id is NULL
 * );
 * if (!player) throw new Error('Player already signed');
 */
export async function atomicUpdate<T>(
  client: PoolClient,
  table: string,
  updates: Record<string, any>,
  conditions: Record<string, any>
): Promise<T | null> {
  const setClauses: string[] = [];
  const whereClauses: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  // Build SET clause
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramCount++}`);
    values.push(value);
  }

  // Build WHERE clause
  for (const [key, value] of Object.entries(conditions)) {
    if (value === null) {
      whereClauses.push(`${key} IS NULL`);
    } else {
      whereClauses.push(`${key} = $${paramCount++}`);
      values.push(value);
    }
  }

  const result = await client.query(
    `UPDATE ${table} SET ${setClauses.join(', ')}
     WHERE ${whereClauses.join(' AND ')}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Check if a condition is met atomically (useful for race condition prevention).
 * Returns true if the row exists and matches conditions.
 */
export async function checkCondition(
  client: PoolClient,
  table: string,
  conditions: Record<string, any>
): Promise<boolean> {
  const whereClauses: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(conditions)) {
    if (value === null) {
      whereClauses.push(`${key} IS NULL`);
    } else {
      whereClauses.push(`${key} = $${paramCount++}`);
      values.push(value);
    }
  }

  const result = await client.query(
    `SELECT 1 FROM ${table} WHERE ${whereClauses.join(' AND ')} LIMIT 1`,
    values
  );

  return result.rows.length > 0;
}
