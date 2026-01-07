import { pool } from './pool';
import { PoolClient } from 'pg';

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION UTILITIES
// Provides atomic database operations to prevent race conditions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a consistent numeric lock ID from a string key.
 * Used by withAdvisoryLock to create unique lock identifiers.
 */
function hashToLockId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

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
 * Execute a function within a transaction with an advisory lock.
 * Use this for operations that need to be serialized across multiple requests,
 * such as signing players, executing trades, or advancing seasons.
 *
 * The lock is automatically released when the transaction ends.
 *
 * @example
 * const result = await withAdvisoryLock(`sign-player-${playerId}`, async (client) => {
 *   const player = await lockPlayer(client, playerId);
 *   if (!player || player.team_id) throw new Error('Not available');
 *   // ... sign player
 * });
 */
export async function withAdvisoryLock<T>(
  lockKey: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const lockId = hashToLockId(lockKey);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // pg_advisory_xact_lock automatically releases when transaction ends
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockId]);
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
 * Lock user's active franchise for exclusive access.
 * Prevents race conditions in season advancement, etc.
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
 * Lock a player row for exclusive access.
 * Use this before signing, trading, or modifying player data.
 *
 * @example
 * const player = await lockPlayer(client, playerId);
 * if (!player || player.team_id !== null) {
 *   throw new Error('Player not available');
 * }
 */
export async function lockPlayer(
  client: PoolClient,
  playerId: string
): Promise<any | null> {
  const result = await client.query(
    `SELECT * FROM players WHERE id = $1 FOR UPDATE`,
    [playerId]
  );
  return result.rows[0] || null;
}

/**
 * Lock a draft prospect row for exclusive access.
 * Use this before drafting to prevent duplicate picks.
 *
 * @example
 * const prospect = await lockProspect(client, prospectId);
 * if (!prospect || prospect.drafted_by_team_id) {
 *   throw new Error('Prospect not available');
 * }
 */
export async function lockProspect(
  client: PoolClient,
  prospectId: string
): Promise<any | null> {
  const result = await client.query(
    `SELECT * FROM draft_prospects WHERE id = $1 FOR UPDATE`,
    [prospectId]
  );
  return result.rows[0] || null;
}

/**
 * Lock a playoff series row for exclusive access.
 * Use this before simulating games to prevent duplicate simulations.
 */
export async function lockPlayoffSeries(
  client: PoolClient,
  seriesId: string
): Promise<any | null> {
  const result = await client.query(
    `SELECT * FROM playoff_series WHERE id = $1 FOR UPDATE`,
    [seriesId]
  );
  return result.rows[0] || null;
}
