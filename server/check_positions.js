require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function checkPositions() {
  const teams = await pool.query("SELECT id, abbreviation FROM teams");
  
  console.log("Position distribution per team:");
  console.log("================================");
  
  const issues = [];
  
  for (const team of teams.rows) {
    const roster = await pool.query(`
      SELECT position, COUNT(*) as count
      FROM players WHERE team_id = $1
      GROUP BY position ORDER BY position
    `, [team.id]);
    
    const counts = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
    for (const r of roster.rows) {
      counts[r.position] = parseInt(r.count);
    }
    
    const missing = [];
    const excess = [];
    for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
      if (counts[pos] === 0) missing.push(pos);
      else if (counts[pos] >= 5) excess.push(pos + ":" + counts[pos]);
    }
    
    if (missing.length > 0 || excess.length > 0) {
      const posStr = Object.entries(counts).map(([k,v]) => k + ":" + v).join(" ");
      issues.push({ team: team.abbreviation, counts, missing, excess });
      console.log(team.abbreviation + ": " + posStr + (missing.length ? " MISSING: " + missing.join(",") : ""));
    }
  }
  
  console.log("\nTeams with issues:", issues.length);
  
  process.exit(0);
}

checkPositions().catch(console.error);
