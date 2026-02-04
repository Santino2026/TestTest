require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function scaleAttributes() {
  const result = await pool.query(`
    SELECT p.id, p.overall, pa.*
    FROM players p
    JOIN player_attributes pa ON p.id = pa.player_id
  `);
  
  console.log("Scaling attributes for", result.rows.length, "players...");
  
  const attrCols = [
    "inside_scoring", "mid_range", "three_point", "free_throw", "shot_iq",
    "offensive_consistency", "layup", "standing_dunk", "driving_dunk", "draw_foul",
    "post_moves", "ball_handling", "passing_accuracy", "passing_vision", "passing_iq",
    "interior_defense", "perimeter_defense", "steal", "block", "defensive_iq",
    "defensive_consistency", "offensive_rebound", "defensive_rebound", "speed",
    "acceleration", "strength", "vertical", "stamina", "hustle", "basketball_iq",
    "clutch", "consistency", "work_ethic", "close_shot", "post_control",
    "speed_with_ball", "offensive_iq", "lateral_quickness", "help_defense_iq",
    "box_out", "rebound_timing", "aggression", "composure"
  ];
  
  let count = 0;
  for (const row of result.rows) {
    const overall = row.overall;
    // For NBA players (68+), attributes should average around overall-10 to overall
    // Scale factor based on overall
    const targetAvg = overall - 5;
    
    // Calculate current average of key attributes
    let sum = 0, num = 0;
    for (const col of attrCols) {
      if (row[col] !== null && row[col] !== undefined) {
        sum += row[col];
        num++;
      }
    }
    const currentAvg = sum / num;
    
    // Scale factor to bring average to target
    const scaleFactor = targetAvg / currentAvg;
    
    const updates = {};
    for (const col of attrCols) {
      if (row[col] !== null && row[col] !== undefined) {
        const scaled = Math.round(row[col] * scaleFactor);
        // Clamp between 35 and 99 (NBA players should have minimum 35 in any stat)
        updates[col] = Math.max(35, Math.min(99, scaled));
      }
    }
    
    const setClauses = Object.keys(updates).map(col => col + " = " + updates[col]).join(", ");
    await pool.query("UPDATE player_attributes SET " + setClauses + " WHERE player_id = $1", [row.id]);
    
    count++;
    if (count % 200 === 0) console.log("  Processed", count, "players...");
  }
  
  console.log("Done! Scaled attributes for", count, "players");
  process.exit(0);
}

scaleAttributes().catch(console.error);
