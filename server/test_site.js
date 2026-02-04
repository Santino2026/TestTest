require("dotenv").config();
const jwt = require("jsonwebtoken");
const { pool } = require("./dist/db/pool");

async function test() {
  const franchise = await pool.query(`
    SELECT f.*, t.name as team_name, u.email
    FROM franchises f
    JOIN teams t ON f.team_id = t.id
    JOIN users u ON f.user_id = u.id
    WHERE t.name = $1
  `, ["Lumberjacks"]);
  
  if (franchise.rows.length === 0) {
    console.log("Lumberjacks franchise not found");
    process.exit(1);
  }
  
  const f = franchise.rows[0];
  console.log("Testing with:", f.team_name);
  console.log("User:", f.email);
  console.log("Phase:", f.phase);
  
  const rosterBefore = await pool.query(
    "SELECT position, COUNT(*) as count FROM players WHERE team_id = $1 GROUP BY position ORDER BY position",
    [f.team_id]
  );
  const totalBefore = rosterBefore.rows.reduce((s, r) => s + parseInt(r.count), 0);
  console.log("\nBefore auto-sign:");
  console.log("  Roster:", totalBefore);
  console.log("  Positions:", rosterBefore.rows.map(r => r.position + ":" + r.count).join(", "));
  
  const token = jwt.sign({ userId: f.user_id, hasPurchased: true }, process.env.JWT_SECRET);
  
  console.log("\nCalling auto-sign endpoint...");
  const response = await fetch("http://localhost:3001/api/freeagency/auto-sign", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  });
  
  const result = await response.json();
  console.log("\nResponse:", response.status);
  console.log(JSON.stringify(result, null, 2));
  
  const rosterAfter = await pool.query(
    "SELECT position, COUNT(*) as count FROM players WHERE team_id = $1 GROUP BY position ORDER BY position",
    [f.team_id]
  );
  const totalAfter = rosterAfter.rows.reduce((s, r) => s + parseInt(r.count), 0);
  console.log("\nAfter auto-sign:");
  console.log("  Roster:", totalAfter);
  console.log("  Positions:", rosterAfter.rows.map(r => r.position + ":" + r.count).join(", "));
  
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
