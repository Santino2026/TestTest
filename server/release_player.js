require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function release() {
  // Get the Bridges franchise
  const franchise = await pool.query(`
    SELECT f.*, t.name FROM franchises f
    JOIN teams t ON f.team_id = t.id
    WHERE f.is_active = true AND t.name = $1
  `, ["Bridges"]);
  
  const f = franchise.rows[0];
  console.log("Franchise:", f.name);
  
  // Get the lowest overall player on the roster
  const player = await pool.query(`
    SELECT id, first_name, last_name, position, overall, salary
    FROM players
    WHERE team_id = $1
    ORDER BY overall ASC
    LIMIT 1
  `, [f.team_id]);
  
  const p = player.rows[0];
  console.log("Releasing:", p.first_name, p.last_name, "(", p.position, p.overall, "OVR)");
  
  // Release the player
  await pool.query("UPDATE players SET team_id = NULL, salary = NULL WHERE id = $1", [p.id]);
  await pool.query("DELETE FROM contracts WHERE player_id = $1", [p.id]);
  
  // Get roster count after
  const roster = await pool.query("SELECT COUNT(*) as count FROM players WHERE team_id = $1", [f.team_id]);
  console.log("Roster now:", roster.rows[0].count);
  
  process.exit(0);
}
release().catch(e => { console.error(e); process.exit(1); });
