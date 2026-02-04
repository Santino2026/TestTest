require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function fixOveralls() {
  // Get all rostered players ordered by current overall
  const rostered = await pool.query(`
    SELECT id, overall, first_name, last_name, position
    FROM players 
    WHERE team_id IS NOT NULL
    ORDER BY overall DESC
  `);
  
  console.log("Rostered players:", rostered.rows.length);
  
  // NBA-like distribution for 450 rostered players
  // Top players keep high ratings, bottom players get boosted to minimum 68
  const tiers = [
    { count: 8, min: 92, max: 97 },    // Superstars
    { count: 22, min: 87, max: 91 },   // All-Stars
    { count: 45, min: 82, max: 86 },   // Stars
    { count: 75, min: 78, max: 81 },   // Quality starters
    { count: 100, min: 74, max: 77 },  // Solid starters
    { count: 100, min: 71, max: 73 },  // Rotation players
    { count: 100, min: 68, max: 70 },  // Bench/end of roster
  ];
  
  const updates = [];
  let idx = 0;
  
  for (const tier of tiers) {
    for (let i = 0; i < tier.count && idx < rostered.rows.length; i++) {
      const player = rostered.rows[idx];
      // Linear distribution within tier (best get max, worst get min)
      const posInTier = i / tier.count;
      const newOverall = Math.round(tier.max - posInTier * (tier.max - tier.min));
      updates.push({ id: player.id, newOverall, name: player.first_name + " " + player.last_name });
      idx++;
    }
  }
  
  // Any remaining players get minimum 68
  while (idx < rostered.rows.length) {
    const player = rostered.rows[idx];
    updates.push({ id: player.id, newOverall: 68, name: player.first_name + " " + player.last_name });
    idx++;
  }
  
  // Show new distribution
  const buckets = {};
  for (const u of updates) {
    const tier = Math.floor(u.newOverall / 5) * 5;
    const key = tier + "-" + (tier + 4);
    buckets[key] = (buckets[key] || 0) + 1;
  }
  
  console.log("\nNew rostered distribution:");
  Object.keys(buckets).sort((a,b) => parseInt(b) - parseInt(a)).forEach(k => {
    console.log("  " + k + ": " + buckets[k]);
  });
  
  console.log("\nTop 10:");
  for (let i = 0; i < 10; i++) {
    console.log("  " + updates[i].newOverall + " - " + updates[i].name);
  }
  
  console.log("\nBottom 10:");
  for (let i = updates.length - 10; i < updates.length; i++) {
    console.log("  " + updates[i].newOverall + " - " + updates[i].name);
  }
  
  // Apply updates
  console.log("\nApplying updates to rostered players...");
  for (const u of updates) {
    await pool.query("UPDATE players SET overall = $1 WHERE id = $2", [u.newOverall, u.id]);
  }
  console.log("Updated", updates.length, "rostered players");
  
  // Now fix free agents - boost those with attributes to minimum 60
  console.log("\nFixing free agents...");
  const freeAgents = await pool.query(`
    SELECT p.id, p.overall
    FROM players p
    JOIN player_attributes pa ON p.id = pa.player_id
    WHERE p.team_id IS NULL AND p.overall < 60
  `);
  
  for (const fa of freeAgents.rows) {
    // Boost to 60-65 range
    const newOverall = 60 + Math.floor(Math.random() * 6);
    await pool.query("UPDATE players SET overall = $1 WHERE id = $2", [newOverall, fa.id]);
  }
  console.log("Boosted", freeAgents.rows.length, "free agents to 60+ OVR");
  
  // Free agents without attributes stay lower (deep pool)
  
  process.exit(0);
}

fixOveralls().catch(console.error);
