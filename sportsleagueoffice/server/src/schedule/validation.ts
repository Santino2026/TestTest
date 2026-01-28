import pool from '../db/pool.js';

interface ValidationResult {
  valid: boolean;
  regularGames: number;
  teamsWithWrongCount: { abbreviation: string; count: number }[];
  issues: string[];
}

/**
 * Validates that a schedule was correctly inserted into the database.
 * Checks:
 * - Exactly 1230 regular season games (30 teams × 82 / 2)
 * - Each team has exactly 82 regular season games
 * - Each team has exactly 41 home games
 */
export async function validateScheduleInsertion(
  seasonId: string,
  client?: typeof pool
): Promise<ValidationResult> {
  const db = client || pool;
  const issues: string[] = [];

  // Check total regular season games
  const totalResult = await db.query(
    `SELECT COUNT(*) as count
     FROM schedule
     WHERE season_id = $1 AND is_preseason = false`,
    [seasonId]
  );

  const regularGames = parseInt(totalResult.rows[0].count);
  const expectedRegularGames = 1230;

  if (regularGames !== expectedRegularGames) {
    issues.push(`Expected ${expectedRegularGames} regular season games, found ${regularGames}`);
  }

  // Check each team has exactly 82 games
  const teamCountResult = await db.query(
    `SELECT t.abbreviation, COUNT(*) as game_count
     FROM teams t
     LEFT JOIN schedule s ON (s.home_team_id = t.id OR s.away_team_id = t.id)
       AND s.season_id = $1 AND s.is_preseason = false
     GROUP BY t.id, t.abbreviation
     HAVING COUNT(*) != 82
     ORDER BY COUNT(*) ASC`,
    [seasonId]
  );

  const teamsWithWrongCount = teamCountResult.rows.map((r) => ({
    abbreviation: r.abbreviation,
    count: parseInt(r.game_count),
  }));

  if (teamsWithWrongCount.length > 0) {
    issues.push(
      `Teams with incorrect game counts: ${teamsWithWrongCount.map((t) => `${t.abbreviation}(${t.count})`).join(', ')}`
    );
  }

  // Check each team has exactly 41 home games
  const homeCountResult = await db.query(
    `SELECT t.abbreviation, COUNT(*) as home_count
     FROM teams t
     LEFT JOIN schedule s ON s.home_team_id = t.id
       AND s.season_id = $1 AND s.is_preseason = false
     GROUP BY t.id, t.abbreviation
     HAVING COUNT(*) != 41
     ORDER BY COUNT(*) ASC`,
    [seasonId]
  );

  if (homeCountResult.rows.length > 0) {
    const badHomeTeams = homeCountResult.rows.map((r) => `${r.abbreviation}(${r.home_count})`).join(', ');
    issues.push(`Teams with incorrect home game counts: ${badHomeTeams}`);
  }

  return {
    valid: issues.length === 0,
    regularGames,
    teamsWithWrongCount,
    issues,
  };
}

/**
 * Throws an error if schedule validation fails.
 * Use this after inserting a schedule to ensure data integrity.
 */
export async function assertValidSchedule(seasonId: string, client?: typeof pool): Promise<void> {
  const result = await validateScheduleInsertion(seasonId, client);

  if (!result.valid) {
    throw new Error(`Schedule validation failed: ${result.issues.join('; ')}`);
  }
}
