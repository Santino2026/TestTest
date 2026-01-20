// One-off script to regenerate schedule for a specific season
import { pool } from '../db/pool';
import { generateSchedule, generatePreseasonSchedule, validateSchedule } from '../schedule/generator';

async function regenerateSchedule(seasonId: number, franchiseTeamId: string) {
  console.log(`Regenerating schedule for season ${seasonId}...`);

  // Delete existing unplayed games for this season
  const deleteResult = await pool.query(
    `DELETE FROM schedule WHERE season_id = $1 AND status = 'scheduled'`,
    [seasonId]
  );
  console.log(`Deleted ${deleteResult.rowCount} existing scheduled games`);

  // Get all teams
  const teamsResult = await pool.query(
    'SELECT id, conference, division FROM teams'
  );
  const teams = teamsResult.rows;

  console.log(`Found ${teams.length} teams`);

  // Generate regular season schedule
  const schedule = generateSchedule(teams);

  console.log(`Generated ${schedule.length} regular season games`);

  // Check game counts and home counts
  const gameCounts = new Map<string, number>();
  const homeCounts = new Map<string, number>();
  for (const game of schedule) {
    gameCounts.set(game.home_team_id, (gameCounts.get(game.home_team_id) || 0) + 1);
    gameCounts.set(game.away_team_id, (gameCounts.get(game.away_team_id) || 0) + 1);
    homeCounts.set(game.home_team_id, (homeCounts.get(game.home_team_id) || 0) + 1);
  }

  let hasIssues = false;
  let maxDeviation = 0;
  for (const team of teams) {
    const total = gameCounts.get(team.id) || 0;
    const home = homeCounts.get(team.id) || 0;
    const homeDeviation = Math.abs(home - 41);
    if (homeDeviation > maxDeviation) maxDeviation = homeDeviation;
    if (total !== 82 || home < 39 || home > 43) {
      console.log(`  ${team.id} (${team.division}): ${total} total, ${home} home`);
      hasIssues = true;
    }
  }

  if (hasIssues) {
    console.error('Schedule has major issues - some teams have way off counts!');
    process.exit(1);
  }

  if (maxDeviation > 0) {
    console.log(`Note: Home games range from ${41 - maxDeviation} to ${41 + maxDeviation} (minor variance, acceptable)`);
  } else {
    console.log('All teams have exactly 82 games and 41 home games');
  }

  // Insert regular season schedule
  for (const game of schedule) {
    const isUserGame = game.home_team_id === franchiseTeamId || game.away_team_id === franchiseTeamId;
    await pool.query(
      `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason, game_day)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)`,
      [seasonId, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame, game.game_day]
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
      `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_user_game, is_preseason, game_day)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
      [seasonId, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, isUserGame, game.game_day]
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
