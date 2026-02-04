require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function test() {
  const franchise = await pool.query(`
    SELECT f.*, t.name as team_name, f.user_id
    FROM franchises f 
    JOIN teams t ON f.team_id = t.id 
    WHERE f.phase = $1 AND f.offseason_phase = $2
    LIMIT 1
  `, ["offseason", "free_agency"]);
  
  if (franchise.rows.length === 0) {
    console.log("No franchise in free_agency phase");
    process.exit(1);
  }
  
  const f = franchise.rows[0];
  console.log("Franchise:", f.team_name);
  console.log("Phase:", f.phase, "/", f.offseason_phase);
  
  const roster = await pool.query(`
    SELECT position, COUNT(*) as count 
    FROM players 
    WHERE team_id = $1 
    GROUP BY position 
    ORDER BY position
  `, [f.team_id]);
  
  const total = roster.rows.reduce((s, r) => s + parseInt(r.count), 0);
  console.log("\nRoster size:", total);
  console.log("By position:", roster.rows.map(r => r.position + ":" + r.count).join(", "));
  
  const salary = await pool.query(`
    SELECT COALESCE(SUM(salary), 0) as total FROM players WHERE team_id = $1
  `, [f.team_id]);
  console.log("Total salary:", (salary.rows[0].total / 1000000).toFixed(1) + "M");
  
  const freeAgents = await pool.query("SELECT COUNT(*) as count FROM players WHERE team_id IS NULL");
  console.log("Free agents available:", freeAgents.rows[0].count);
  
  if (total >= 15) {
    console.log("\nRoster already at 15 - cannot test auto-sign");
    process.exit(0);
  }
  
  console.log("\n--- Testing auto-sign endpoint ---");
  
  const jwt = require("jsonwebtoken");
  // Include hasPurchased in the token payload
  const token = jwt.sign({ userId: f.user_id, hasPurchased: true }, process.env.JWT_SECRET);
  
  const response = await fetch("http://localhost:3001/api/freeagency/auto-sign", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  });
  
  const result = await response.json();
  console.log("\nResponse status:", response.status);
  console.log("Result:", JSON.stringify(result, null, 2));
  
  // Check roster after
  const rosterAfter = await pool.query(`
    SELECT position, COUNT(*) as count 
    FROM players 
    WHERE team_id = $1 
    GROUP BY position 
    ORDER BY position
  `, [f.team_id]);
  const totalAfter = rosterAfter.rows.reduce((s, r) => s + parseInt(r.count), 0);
  console.log("\n--- After auto-sign ---");
  console.log("Roster size:", totalAfter);
  console.log("By position:", rosterAfter.rows.map(r => r.position + ":" + r.count).join(", "));
  
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
