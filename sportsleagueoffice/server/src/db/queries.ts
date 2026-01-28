import { pool } from './pool';
import { PoolClient } from 'pg';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED DATABASE QUERIES
// These functions eliminate duplication across 9+ route files
// ═══════════════════════════════════════════════════════════════════════════

export interface Franchise {
  id: string;
  user_id: string;
  team_id: string;
  season_id: string;
  phase: string;
  current_day: number;
  name: string;
  is_active: boolean;
  season_number: number;
  offseason_phase: string | null;
  all_star_complete: boolean;
  championships: number;
  team_name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  primary_color: string;
  wins: number;
  losses: number;
}

export interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  primary_color?: string;
  secondary_color?: string;
}

// Get user's active franchise with team and standings info
// Used in: season.ts, freeagency.ts, trades.ts, playoffs.ts, draft.ts, etc.
export async function getUserActiveFranchise(
  userId: string,
  client?: PoolClient
): Promise<Franchise | null> {
  const db = client || pool;
  const result = await db.query(
    `SELECT f.*, t.name as team_name, t.abbreviation, t.city, t.conference, t.division, t.primary_color,
            s.wins, s.losses
     FROM franchises f
     JOIN teams t ON f.team_id = t.id
     LEFT JOIN standings s ON s.team_id = f.team_id AND s.season_id = f.season_id
     WHERE f.user_id = $1 AND f.is_active = TRUE`,
    [userId]
  );
  return result.rows[0] || null;
}

// Get franchise by ID with full details
export async function getFranchiseWithDetails(
  franchiseId: string,
  client?: PoolClient
): Promise<Franchise | null> {
  const db = client || pool;
  const result = await db.query(
    `SELECT f.*, t.name as team_name, t.abbreviation, t.city,
            t.primary_color, t.secondary_color, t.conference, t.division,
            s.wins, s.losses
     FROM franchises f
     JOIN teams t ON f.team_id = t.id
     LEFT JOIN standings s ON f.team_id = s.team_id AND f.season_id = s.season_id
     WHERE f.id = $1`,
    [franchiseId]
  );
  return result.rows[0] || null;
}

// Get current active season (most recent non-completed)
// Used in 9+ files
export async function getCurrentSeasonId(client?: PoolClient): Promise<string | null> {
  const db = client || pool;
  const result = await db.query(
    `SELECT id FROM seasons WHERE status != 'completed' ORDER BY id DESC LIMIT 1`
  );
  return result.rows[0]?.id || null;
}

// Get most recent season (regardless of status)
export async function getLatestSeasonId(client?: PoolClient): Promise<string | null> {
  const db = client || pool;
  const result = await db.query(
    `SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`
  );
  return result.rows[0]?.id || null;
}

// Verify franchise ownership
export async function verifyFranchiseOwnership(
  franchiseId: string,
  userId: string,
  client?: PoolClient
): Promise<boolean> {
  const db = client || pool;
  const result = await db.query(
    'SELECT id FROM franchises WHERE id = $1 AND user_id = $2',
    [franchiseId, userId]
  );
  return result.rows.length > 0;
}

// Get team with conference/division info (for standings calculations)
export async function getTeamInfo(
  teamId: string,
  client?: PoolClient
): Promise<TeamInfo | null> {
  const db = client || pool;
  const result = await db.query(
    `SELECT id, name, abbreviation, city, conference, division, primary_color, secondary_color
     FROM teams WHERE id = $1`,
    [teamId]
  );
  return result.rows[0] || null;
}

// Get multiple teams' info at once (for game simulations)
export async function getTeamsInfo(
  teamIds: string[],
  client?: PoolClient
): Promise<Map<string, TeamInfo>> {
  const db = client || pool;
  const result = await db.query(
    `SELECT id, name, abbreviation, city, conference, division
     FROM teams WHERE id = ANY($1)`,
    [teamIds]
  );

  const map = new Map<string, TeamInfo>();
  for (const row of result.rows) {
    map.set(row.id, row);
  }
  return map;
}

// Get all teams (for schedule generation, standings init)
export async function getAllTeams(client?: PoolClient): Promise<TeamInfo[]> {
  const db = client || pool;
  const result = await db.query(
    'SELECT id, name, abbreviation, city, conference, division FROM teams'
  );
  return result.rows;
}

// Get season's All-Star day
export async function getSeasonAllStarDay(
  seasonId: string,
  client?: PoolClient
): Promise<number> {
  const db = client || pool;
  const result = await db.query(
    `SELECT all_star_day FROM seasons WHERE id = $1`,
    [seasonId]
  );
  return result.rows[0]?.all_star_day || 85;
}

// Get season's trade deadline day
export async function getSeasonTradeDeadlineDay(
  seasonId: string,
  client?: PoolClient
): Promise<number> {
  const db = client || pool;
  const result = await db.query(
    `SELECT trade_deadline_day FROM seasons WHERE id = $1`,
    [seasonId]
  );
  return result.rows[0]?.trade_deadline_day || 100;
}

// Update franchise phase and day
export async function updateFranchiseState(
  franchiseId: string,
  updates: {
    current_day?: number;
    phase?: string;
    offseason_phase?: string | null;
    all_star_complete?: boolean;
  },
  client?: PoolClient
): Promise<void> {
  const db = client || pool;
  const setClauses: string[] = ['last_played_at = NOW()'];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.current_day !== undefined) {
    setClauses.push(`current_day = $${paramCount++}`);
    values.push(updates.current_day);
  }
  if (updates.phase !== undefined) {
    setClauses.push(`phase = $${paramCount++}`);
    values.push(updates.phase);
  }
  if (updates.offseason_phase !== undefined) {
    setClauses.push(`offseason_phase = $${paramCount++}`);
    values.push(updates.offseason_phase);
  }
  if (updates.all_star_complete !== undefined) {
    setClauses.push(`all_star_complete = $${paramCount++}`);
    values.push(updates.all_star_complete);
  }

  values.push(franchiseId);
  await db.query(
    `UPDATE franchises SET ${setClauses.join(', ')} WHERE id = $${paramCount}`,
    values
  );
}

// Update season status
export async function updateSeasonStatus(
  seasonId: string,
  status: string,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;
  await db.query(
    `UPDATE seasons SET status = $1 WHERE id = $2`,
    [status, seasonId]
  );
}
