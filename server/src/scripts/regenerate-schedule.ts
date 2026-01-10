// One-off script to regenerate schedule for a specific season
import { pool } from '../db/pool';
import { generateSchedule, generatePreseasonSchedule, validateSchedule } from '../schedule/generator';

async function regenerateSchedule(seasonId: number, franchiseTeamId: string) {
  console.log(`Regenerating schedule for season ${seasonId}...`);

  // Get all teams
  const teamsResult = await pool.query(
    'SELECT id, conference, division FROM teams'
  );
  const teams = teamsResult.rows;

  // Generate regular season schedule
  const schedule = generateSchedule(teams);

  // Validate
  if (!validateSchedule(schedule, teams)) {
    console.error('Schedule validation failed!');
    process.exit(1);
  }

  console.log(`Generated ${schedule.length} regular season games`);

  // Check game counts
  const gameCounts = new Map<string, number>();
  for (const game of schedule) {
    gameCounts.set(game.home_team_id, (gameCounts.get(game.home_team_id) || 0) + 1);
    gameCounts.set(game.away_team_id, (gameCounts.get(game.away_team_id) || 0) + 1);
  }

  let allValid = true;
  for (const [teamId, count] of gameCounts) {
    if (count !== 82) {
      console.error(`Team ${teamId} has ${count} games (expected 82)`);
      allValid = false;
    }
  }

  if (!allValid) {
    console.error('Schedule has incorrect game counts!');
    process.exit(1);
  }

  console.log('All teams have exactly 82 games');

  // Insert regular season schedule
  for (const game of schedule) {
    const isUserGame = game.home_team_id === franchiseTeamId || game.away_team_id === franchiseTeamId;
    await pool.query(
      `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
      [seasonId, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame]
    );
  }

  console.log('Regular season schedule inserted');

  // Generate preseason schedule
  const preseason = generatePreseasonSchedule(teams);
  console.log(`Generated ${preseason.length} preseason games`);

  // Insert preseason schedule
  for (const game of preseason) {
    const isUserGame = game.home_team_id === franchiseTeamId || game.away_team_id === franchiseTeamId;
    await pool.query(
      `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
      [seasonId, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame]
    );
  }

  console.log('Preseason schedule inserted');
  console.log('Done!');

  await pool.end();
}

// Get command line args
const seasonId = parseInt(process.argv[2] || '72');
const franchiseTeamId = process.argv[3] || '';

if (!franchiseTeamId) {
  console.error('Usage: npx ts-node src/scripts/regenerate-schedule.ts <seasonId> <franchiseTeamId>');
  process.exit(1);
}

regenerateSchedule(seasonId, franchiseTeamId).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
