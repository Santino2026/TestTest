require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function check() {
  // Simple query to get all overalls
  const result = await pool.query("SELECT overall FROM players ORDER BY overall DESC");
  
  const buckets = {
    "90-99": 0, "85-89": 0, "80-84": 0, "75-79": 0,
    "70-74": 0, "65-69": 0, "60-64": 0, "55-59": 0, "below55": 0
  };
  
  for (const r of result.rows) {
    const o = r.overall;
    if (o >= 90) buckets["90-99"]++;
    else if (o >= 85) buckets["85-89"]++;
    else if (o >= 80) buckets["80-84"]++;
    else if (o >= 75) buckets["75-79"]++;
    else if (o >= 70) buckets["70-74"]++;
    else if (o >= 65) buckets["65-69"]++;
    else if (o >= 60) buckets["60-64"]++;
    else if (o >= 55) buckets["55-59"]++;
    else buckets["below55"]++;
  }
  
  console.log("Current Overall Distribution:");
  console.log("=============================");
  console.log("90-99 Superstar:      " + buckets["90-99"]);
  console.log("85-89 All-Star:       " + buckets["85-89"]);
  console.log("80-84 Star:           " + buckets["80-84"]);
  console.log("75-79 Quality Start:  " + buckets["75-79"]);
  console.log("70-74 Starter:        " + buckets["70-74"]);
  console.log("65-69 Rotation:       " + buckets["65-69"]);
  console.log("60-64 Bench:          " + buckets["60-64"]);
  console.log("55-59 Deep Bench:     " + buckets["55-59"]);
  console.log("Below 55:             " + buckets["below55"]);
  
  const top = await pool.query(
    "SELECT first_name, last_name, position, overall FROM players ORDER BY overall DESC LIMIT 20"
  );
  console.log("\nTop 20 Players:");
  for (const p of top.rows) {
    console.log("  " + p.overall + " - " + p.first_name + " " + p.last_name + " " + p.position);
  }
  
  console.log("\nTotal players:", result.rows.length);
  console.log("Min overall:", result.rows[result.rows.length-1].overall);
  console.log("Max overall:", result.rows[0].overall);
  
  process.exit(0);
}
check().catch(console.error);
