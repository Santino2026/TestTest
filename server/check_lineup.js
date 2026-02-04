require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function check() {
  // Check players table columns
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, ["players"]);
  
  console.log("Players table columns:");
  for (const c of cols.rows) {
    if (c.column_name.includes("start") || c.column_name.includes("lineup") || 
        c.column_name.includes("depth") || c.column_name.includes("rotation") ||
        c.column_name.includes("position") || c.column_name.includes("order")) {
      console.log("  *", c.column_name);
    }
  }
  
  // Check a team roster with positions
  const roster = await pool.query(`
    SELECT p.first_name, p.last_name, p.overall, p.position, p.secondary_position
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.abbreviation = $1
    ORDER BY p.overall DESC
  `, ["BKN"]);
  
  console.log("\nBridges roster by position:");
  const byPos = { PG: [], SG: [], SF: [], PF: [], C: [] };
  for (const p of roster.rows) {
    if (byPos[p.position]) {
      byPos[p.position].push(p.overall + " " + p.first_name + " " + p.last_name);
    }
  }
  for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
    console.log("  " + pos + ":", byPos[pos].join(", ") || "NONE");
  }
  
  process.exit(0);
}
check().catch(console.error);
