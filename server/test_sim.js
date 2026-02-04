const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Import simulation
const { simulateGame } = require('./dist/simulation');
const { loadTeamForSimulation } = require('./dist/services/simulation');

async function test() {
  // Load two teams
  const teams = await pool.query('SELECT id, name FROM teams LIMIT 2');
  const team1 = await loadTeamForSimulation(teams.rows[0].id);
  const team2 = await loadTeamForSimulation(teams.rows[1].id);
  
  console.log('Simulating', team1.name, 'vs', team2.name);
  
  // Simulate 5 games and average the stats
  let totalStats = { steals: 0, blocks: 0, assists: 0, points: 0 };
  const games = 5;
  
  for (let i = 0; i < games; i++) {
    const result = simulateGame(team1, team2);
    
    // Sum up stats from both teams
    const homeStats = result.home_player_stats.reduce((acc, p) => ({
      steals: acc.steals + (p.steals || 0),
      blocks: acc.blocks + (p.blocks || 0),
      assists: acc.assists + (p.assists || 0)
    }), { steals: 0, blocks: 0, assists: 0 });
    
    const awayStats = result.away_player_stats.reduce((acc, p) => ({
      steals: acc.steals + (p.steals || 0),
      blocks: acc.blocks + (p.blocks || 0),
      assists: acc.assists + (p.assists || 0)
    }), { steals: 0, blocks: 0, assists: 0 });
    
    totalStats.steals += homeStats.steals + awayStats.steals;
    totalStats.blocks += homeStats.blocks + awayStats.blocks;
    totalStats.assists += homeStats.assists + awayStats.assists;
    totalStats.points += result.home_score + result.away_score;
    
    console.log('Game ' + (i+1) + ':', result.home_score + '-' + result.away_score, 
      '| STL:', homeStats.steals + awayStats.steals,
      '| BLK:', homeStats.blocks + awayStats.blocks,
      '| AST:', homeStats.assists + awayStats.assists);
  }
  
  console.log('\nAverage per game:');
  console.log('  Total Steals:', (totalStats.steals / games).toFixed(1), '(NBA avg: ~14)');
  console.log('  Total Blocks:', (totalStats.blocks / games).toFixed(1), '(NBA avg: ~10)');
  console.log('  Total Assists:', (totalStats.assists / games).toFixed(1), '(NBA avg: ~50)');
  console.log('  Total Points:', (totalStats.points / games).toFixed(1), '(NBA avg: ~220)');
  
  await pool.end();
}
test().catch(e => { console.error(e); process.exit(1); });
