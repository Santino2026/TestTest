require("dotenv").config();
const { pool } = require("./dist/db/pool");

async function check() {
  // Get a top player and their attributes
  const top = await pool.query(`
    SELECT p.id, p.first_name, p.last_name, p.overall, p.position,
           pa.inside_scoring, pa.mid_range, pa.three_point, pa.speed, 
           pa.interior_defense, pa.perimeter_defense, pa.ball_handling
    FROM players p
    JOIN player_attributes pa ON p.id = pa.player_id
    ORDER BY p.overall DESC
    LIMIT 5
  `);
  
  console.log("Top 5 players with attributes:");
  for (const p of top.rows) {
    console.log(p.first_name + " " + p.last_name + " (OVR: " + p.overall + ", " + p.position + ")");
    console.log("  inside:" + p.inside_scoring + " mid:" + p.mid_range + " 3pt:" + p.three_point);
    console.log("  speed:" + p.speed + " intDef:" + p.interior_defense + " perDef:" + p.perimeter_defense);
    console.log("  handling:" + p.ball_handling);
  }
  
  // Get average attributes
  const avg = await pool.query(`
    SELECT ROUND(AVG(inside_scoring),1) as inside, ROUND(AVG(three_point),1) as three,
           ROUND(AVG(speed),1) as speed, ROUND(AVG(interior_defense),1) as int_def,
           ROUND(AVG(ball_handling),1) as handling
    FROM player_attributes
  `);
  console.log("\nAverage attributes:", avg.rows[0]);
  
  // Get min/max
  const minmax = await pool.query(`
    SELECT MIN(inside_scoring) as min_inside, MAX(inside_scoring) as max_inside,
           MIN(three_point) as min_3pt, MAX(three_point) as max_3pt,
           MIN(speed) as min_speed, MAX(speed) as max_speed
    FROM player_attributes
  `);
  console.log("Attribute ranges:", minmax.rows[0]);
  
  process.exit(0);
}
check().catch(console.error);
