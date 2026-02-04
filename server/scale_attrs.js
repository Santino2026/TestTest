require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function scaleAttributes() {
  // Get all players with their attributes
  const result = await pool.query(`
    SELECT p.id, p.overall, pa.*
    FROM players p
    JOIN player_attributes pa ON p.id = pa.player_id
  `);
  
  console.log("Scaling attributes for", result.rows.length, "players...");
  
  // Attribute columns to scale
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
    // Scale factor: overall/65 (so 97 OVR -> 1.49x, 50 OVR -> 0.77x)
    // But we also want to preserve some variance, so we blend with original
    const scaleFactor = overall / 65;
    
    const updates = {};
    for (const col of attrCols) {
      if (row[col] !== null && row[col] !== undefined) {
        // Blend: 70% scaled + 30% original to keep some player uniqueness
        const scaled = row[col] * scaleFactor;
        const blended = scaled * 0.7 + row[col] * 0.3;
        // Clamp between 25 and 99
        updates[col] = Math.max(25, Math.min(99, Math.round(blended)));
      }
    }
    
    // Build update query
    const setClauses = Object.keys(updates).map(col => col + " = " + updates[col]).join(", ");
    await pool.query("UPDATE player_attributes SET " + setClauses + " WHERE player_id = $1", [row.id]);
    
    count++;
    if (count % 500 === 0) console.log("  Processed", count, "players...");
  }
  
  console.log("Done! Scaled attributes for", count, "players");
  process.exit(0);
}

scaleAttributes().catch(console.error);
