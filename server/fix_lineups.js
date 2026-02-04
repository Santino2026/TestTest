require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function fixLineups() {
  const teams = await pool.query("SELECT id, abbreviation, name FROM teams");
  console.log("Fixing lineups for", teams.rows.length, "teams...\n");
  
  for (const team of teams.rows) {
    const roster = await pool.query(`
      SELECT id, first_name, last_name, overall, position
      FROM players WHERE team_id = $1 ORDER BY overall DESC
    `, [team.id]);
    
    // Reset all starters
    await pool.query("UPDATE players SET is_starter = false WHERE team_id = $1", [team.id]);
    
    // Find best player at each position
    const positions = ["PG", "SG", "SF", "PF", "C"];
    const starters = [];
    const usedIds = new Set();
    
    for (const pos of positions) {
      const player = roster.rows.find(p => p.position === pos && !usedIds.has(p.id));
      if (player) {
        starters.push(player);
        usedIds.add(player.id);
        await pool.query("UPDATE players SET is_starter = true WHERE id = $1", [player.id]);
      }
    }
    
    // Fill remaining starter slots with best available
    if (starters.length < 5) {
      for (const player of roster.rows) {
        if (!usedIds.has(player.id) && starters.length < 5) {
          starters.push(player);
          usedIds.add(player.id);
          await pool.query("UPDATE players SET is_starter = true WHERE id = $1", [player.id]);
        }
      }
    }
    
    const starterStr = starters.map(s => s.overall + " " + s.position).join(", ");
    console.log(team.abbreviation + ": " + starterStr);
  }
  
  console.log("\nDone!");
  process.exit(0);
}

fixLineups().catch(console.error);
