require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function adjustOveralls() {
  const result = await pool.query(
    "SELECT id, overall, first_name, last_name FROM players ORDER BY overall DESC, RANDOM()"
  );
  
  const players = result.rows;
  const total = players.length;
  console.log("Total players:", total);
  
  const tiers = [
    { pct: 0.002, min: 90, max: 97 },
    { pct: 0.008, min: 85, max: 89 },
    { pct: 0.022, min: 80, max: 84 },
    { pct: 0.052, min: 75, max: 79 },
    { pct: 0.102, min: 70, max: 74 },
    { pct: 0.202, min: 65, max: 69 },
    { pct: 0.352, min: 60, max: 64 },
    { pct: 0.602, min: 55, max: 59 },
    { pct: 1.0, min: 50, max: 54 },
  ];
  
  const updates = [];
  
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const percentile = i / total;
    
    let newOverall;
    for (const tier of tiers) {
      if (percentile < tier.pct) {
        const tierStart = tiers.indexOf(tier) === 0 ? 0 : tiers[tiers.indexOf(tier) - 1].pct;
        const tierRange = tier.pct - tierStart;
        const posInTier = (percentile - tierStart) / tierRange;
        newOverall = Math.round(tier.max - posInTier * (tier.max - tier.min));
        break;
      }
    }
    
    updates.push({ id: player.id, newOverall, oldOverall: player.overall, name: player.first_name + " " + player.last_name });
  }
  
  // Show distribution
  const newBuckets = { "90-99": 0, "85-89": 0, "80-84": 0, "75-79": 0, "70-74": 0, "65-69": 0, "60-64": 0, "55-59": 0, "50-54": 0 };
  for (const u of updates) {
    const o = u.newOverall;
    if (o >= 90) newBuckets["90-99"]++;
    else if (o >= 85) newBuckets["85-89"]++;
    else if (o >= 80) newBuckets["80-84"]++;
    else if (o >= 75) newBuckets["75-79"]++;
    else if (o >= 70) newBuckets["70-74"]++;
    else if (o >= 65) newBuckets["65-69"]++;
    else if (o >= 60) newBuckets["60-64"]++;
    else if (o >= 55) newBuckets["55-59"]++;
    else newBuckets["50-54"]++;
  }
  
  console.log("\nNew Distribution:");
  console.log("90-99 Superstar:     ", newBuckets["90-99"]);
  console.log("85-89 All-Star:      ", newBuckets["85-89"]);
  console.log("80-84 Star:          ", newBuckets["80-84"]);
  console.log("75-79 Quality Start: ", newBuckets["75-79"]);
  console.log("70-74 Starter:       ", newBuckets["70-74"]);
  console.log("65-69 Rotation:      ", newBuckets["65-69"]);
  console.log("60-64 Bench:         ", newBuckets["60-64"]);
  console.log("55-59 Deep Bench:    ", newBuckets["55-59"]);
  console.log("50-54 End Bench:     ", newBuckets["50-54"]);
  
  console.log("\nTop 15:");
  for (let i = 0; i < 15; i++) {
    console.log("  " + updates[i].newOverall + " - " + updates[i].name);
  }
  
  // Apply updates one by one with parameterized queries
  console.log("\nApplying updates...");
  let count = 0;
  for (const u of updates) {
    await pool.query("UPDATE players SET overall = $1 WHERE id = $2", [u.newOverall, u.id]);
    count++;
    if (count % 500 === 0) console.log("  Updated", count, "players...");
  }
  
  console.log("Done! Updated", count, "players");
  process.exit(0);
}

adjustOveralls().catch(console.error);
