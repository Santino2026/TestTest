require("dotenv").config();
const { pool } = require("./dist/db/pool");

// Expanded position transitions
const transitions = {
  "PG": ["SG"],
  "SG": ["PG", "SF"],
  "SF": ["SG", "PF"],
  "PF": ["SF", "C"],
  "C": ["PF"]
};

async function balancePositions() {
  const teams = await pool.query("SELECT id, abbreviation FROM teams");
  
  for (const team of teams.rows) {
    const roster = await pool.query(`
      SELECT id, first_name, last_name, overall, position
      FROM players WHERE team_id = $1 ORDER BY overall ASC
    `, [team.id]);
    
    const counts = { PG: [], SG: [], SF: [], PF: [], C: [] };
    for (const p of roster.rows) {
      if (counts[p.position]) counts[p.position].push(p);
    }
    
    // Fix empty positions first - higher priority
    for (const needPos of ["C", "PG", "SG", "SF", "PF"]) {
      while (counts[needPos].length === 0) {
        let found = false;
        // Find position with 4+ players that can transition
        for (const fromPos of Object.keys(counts)) {
          if (counts[fromPos].length >= 2 && transitions[fromPos].includes(needPos)) {
            const player = counts[fromPos].shift();
            counts[needPos].push(player);
            await pool.query("UPDATE players SET position = $1 WHERE id = $2", [needPos, player.id]);
            console.log(team.abbreviation + ": " + player.first_name + " " + player.last_name + " " + fromPos + " -> " + needPos);
            found = true;
            break;
          }
        }
        if (!found) break;
      }
    }
    
    // Balance to target 3
    const target = 3;
    for (const needPos of ["PG", "SG", "SF", "PF", "C"]) {
      while (counts[needPos].length < target) {
        let found = false;
        for (const fromPos of Object.keys(counts)) {
          if (counts[fromPos].length > target && transitions[fromPos].includes(needPos)) {
            const player = counts[fromPos].shift();
            counts[needPos].push(player);
            await pool.query("UPDATE players SET position = $1 WHERE id = $2", [needPos, player.id]);
            console.log(team.abbreviation + ": " + player.first_name + " " + player.last_name + " " + fromPos + " -> " + needPos);
            found = true;
            break;
          }
        }
        if (!found) break;
      }
    }
  }
  
  console.log("\nDone!");
  process.exit(0);
}

balancePositions().catch(console.error);
