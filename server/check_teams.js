require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function check() {
  // Check team averages
  const teams = await pool.query(`
    SELECT t.name, t.abbreviation,
           COUNT(p.id) as roster_size,
           ROUND(AVG(p.overall), 1) as avg_overall,
           MAX(p.overall) as best_player,
           MIN(p.overall) as worst_player
    FROM teams t
    LEFT JOIN players p ON t.id = p.team_id
    GROUP BY t.id, t.name, t.abbreviation
    ORDER BY avg_overall DESC
  `);
  
  console.log("Team Rosters by Average Overall:");
  console.log("=================================");
  for (const t of teams.rows) {
    console.log(t.abbreviation + ": " + t.roster_size + " players, avg " + t.avg_overall + " (best: " + t.best_player + ", worst: " + t.worst_player + ")");
  }
  
  // Check position distribution of top players
  const topByPos = await pool.query(`
    SELECT position, COUNT(*) as count
    FROM players
    WHERE overall >= 80
    GROUP BY position
    ORDER BY count DESC
  `);
  console.log("\nPlayers 80+ OVR by position:");
  for (const p of topByPos.rows) {
    console.log("  " + p.position + ": " + p.count);
  }
  
  // Check rostered players distribution
  const rostered = await pool.query(`
    SELECT 
      CASE 
        WHEN overall >= 90 THEN 90+
        WHEN overall >= 80 THEN 80-89
        WHEN overall >= 70 THEN 70-79
        WHEN overall >= 60 THEN 60-69
        ELSE 50-59
      END as tier,
      COUNT(*) as count
    FROM players
    WHERE team_id IS NOT NULL
    GROUP BY tier
    ORDER BY tier DESC
  `);
  console.log("\nRostered players by tier:");
  for (const r of rostered.rows) {
    console.log("  " + r.tier + ": " + r.count);
  }
  
  process.exit(0);
}
check().catch(console.error);
