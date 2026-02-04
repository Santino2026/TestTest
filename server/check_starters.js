require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function check() {
  // Check current starters for a team
  const starters = await pool.query(`
    SELECT p.first_name, p.last_name, p.overall, p.position, p.is_starter
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.abbreviation = $1
    ORDER BY p.is_starter DESC, p.overall DESC
  `, ["BKN"]);
  
  console.log("Bridges - Current Starters:");
  for (const p of starters.rows) {
    const star = p.is_starter ? "[STARTER]" : "";
    console.log("  " + p.overall + " " + p.first_name + " " + p.last_name + " (" + p.position + ") " + star);
  }
  
  // Count starters per team
  const starterCounts = await pool.query(`
    SELECT t.abbreviation, COUNT(*) FILTER (WHERE p.is_starter = true) as starters
    FROM teams t
    JOIN players p ON t.id = p.team_id
    GROUP BY t.id, t.abbreviation
    ORDER BY starters DESC
  `);
  
  console.log("\nStarters per team:");
  for (const t of starterCounts.rows) {
    console.log("  " + t.abbreviation + ": " + t.starters + " starters");
  }
  
  process.exit(0);
}
check().catch(console.error);
