require("dotenv").config();
const { pool } = require("./dist/db/pool");

// Position transitions (what positions can convert to what)
const transitions = {
  "PG": ["SG"],
  "SG": ["PG", "SF"],
  "SF": ["SG", "PF"],
  "PF": ["SF", "C"],
  "C": ["PF"]
};

async function balancePositions() {
  const teams = await pool.query("SELECT id, abbreviation FROM teams");
  console.log("Balancing positions for", teams.rows.length, "teams...\n");
  
  for (const team of teams.rows) {
    // Get roster with positions
    const roster = await pool.query(`
      SELECT id, first_name, last_name, overall, position
      FROM players WHERE team_id = $1 ORDER BY overall ASC
    `, [team.id]);
    
    // Count by position
    const counts = { PG: [], SG: [], SF: [], PF: [], C: [] };
    for (const p of roster.rows) {
      if (counts[p.position]) counts[p.position].push(p);
    }
    
    // Target: 3 per position
    const target = 3;
    let changes = [];
    
    // Find positions needing players and positions with excess
    for (const needPos of ["PG", "SG", "SF", "PF", "C"]) {
      while (counts[needPos].length < target) {
        // Find a position with excess that can transition to needPos
        let found = false;
        for (const fromPos of Object.keys(counts)) {
          if (counts[fromPos].length > target && transitions[fromPos].includes(needPos)) {
            // Move the lowest overall player from excess position
            const player = counts[fromPos].shift();
            counts[needPos].push(player);
            changes.push({ player: player.first_name + " " + player.last_name, from: fromPos, to: needPos });
            await pool.query("UPDATE players SET position = $1 WHERE id = $2", [needPos, player.id]);
            found = true;
            break;
          }
        }
        if (!found) break; // No valid transition available
      }
    }
    
    // Also try to fill completely empty positions
    for (const needPos of ["PG", "SG", "SF", "PF", "C"]) {
      if (counts[needPos].length === 0) {
        // Find any position with 4+ that can transition
        for (const fromPos of Object.keys(counts)) {
          if (counts[fromPos].length >= 4 && transitions[fromPos].includes(needPos)) {
            const player = counts[fromPos].shift();
            counts[needPos].push(player);
            changes.push({ player: player.first_name + " " + player.last_name, from: fromPos, to: needPos });
            await pool.query("UPDATE players SET position = $1 WHERE id = $2", [needPos, player.id]);
            break;
          }
        }
      }
    }
    
    if (changes.length > 0) {
      console.log(team.abbreviation + ": " + changes.length + " position changes");
      for (const c of changes) {
        console.log("  " + c.player + ": " + c.from + " -> " + c.to);
      }
    }
  }
  
  console.log("\nDone!");
  process.exit(0);
}

balancePositions().catch(console.error);
