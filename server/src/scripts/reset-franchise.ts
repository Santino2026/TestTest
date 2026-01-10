// Reset franchise to preseason for testing
import { pool } from '../db/pool';

async function resetFranchise() {
  // Get franchise
  const f = await pool.query('SELECT * FROM franchises WHERE is_active = true LIMIT 1');
  if (!f.rows[0]) {
    console.log('No active franchise found');
    await pool.end();
    return;
  }

  const franchise = f.rows[0];
  console.log('Resetting franchise:', franchise.name || franchise.id);
  console.log('Season ID:', franchise.season_id);

  // Delete all games and stats for this season
  console.log('Deleting player game stats...');
  await pool.query(
    'DELETE FROM player_game_stats WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)',
    [franchise.season_id]
  );

  console.log('Deleting team game stats...');
  await pool.query(
    'DELETE FROM team_game_stats WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)',
    [franchise.season_id]
  );

  console.log('Deleting game quarters...');
  await pool.query(
    'DELETE FROM game_quarters WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)',
    [franchise.season_id]
  );

  console.log('Deleting plays...');
  await pool.query(
    'DELETE FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)',
    [franchise.season_id]
  );

  console.log('Deleting games...');
  await pool.query('DELETE FROM games WHERE season_id = $1', [franchise.season_id]);

  // Reset schedule to scheduled
  console.log('Resetting schedule...');
  await pool.query(
    "UPDATE schedule SET status = 'scheduled', game_id = NULL WHERE season_id = $1",
    [franchise.season_id]
  );

  // Reset standings
  console.log('Resetting standings...');
  await pool.query(
    `UPDATE standings SET
      wins=0, losses=0,
      home_wins=0, home_losses=0,
      away_wins=0, away_losses=0,
      conference_wins=0, conference_losses=0,
      division_wins=0, division_losses=0,
      points_for=0, points_against=0,
      streak=0, last_10_wins=0
    WHERE season_id = $1`,
    [franchise.season_id]
  );

  // Reset franchise to preseason day -7
  console.log('Resetting franchise state...');
  await pool.query(
    `UPDATE franchises SET
      current_day = -7,
      phase = 'preseason',
      preseason_wins = 0,
      preseason_losses = 0
    WHERE id = $1`,
    [franchise.id]
  );

  console.log('\nFranchise reset to preseason day -7');
  console.log('Ready for testing!');

  await pool.end();
}

resetFranchise().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
