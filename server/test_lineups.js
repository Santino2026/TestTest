const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  // Check overall distribution for rostered players
  const overalls = await pool.query(
    "SELECT MIN(overall) as min_ovr, MAX(overall) as max_ovr, ROUND(AVG(overall)) as avg_ovr, COUNT(*) as total FROM players WHERE team_id IS NOT NULL"
  );
  console.log('Rostered player overalls:', overalls.rows[0]);
  
  // Check starters per team
  const starters = await pool.query(
    "SELECT t.abbreviation, COUNT(*) as starter_count FROM players p JOIN teams t ON p.team_id = t.id WHERE p.is_starter = true GROUP BY t.abbreviation ORDER BY t.abbreviation"
  );
  console.log('\nStarters per team:');
  starters.rows.forEach(r => console.log('  ' + r.abbreviation + ': ' + r.starter_count));
  
  // Check a sample team's starting 5
  const chi = await pool.query(
    "SELECT p.first_name, p.last_name, p.position, p.overall FROM players p JOIN teams t ON p.team_id = t.id WHERE t.abbreviation = 'CHI' AND p.is_starter = true ORDER BY p.overall DESC"
  );
  console.log('\nCHI Starting 5:');
  chi.rows.forEach(r => console.log('  ' + r.overall + ' ' + r.first_name + ' ' + r.last_name + ' (' + r.position + ')'));

  // Check positions are balanced
  const positions = await pool.query(
    "SELECT t.abbreviation, p.position, COUNT(*) as cnt FROM players p JOIN teams t ON p.team_id = t.id GROUP BY t.abbreviation, p.position ORDER BY t.abbreviation, p.position"
  );
  const teamPositions = {};
  positions.rows.forEach(r => {
    if (!teamPositions[r.abbreviation]) teamPositions[r.abbreviation] = {};
    teamPositions[r.abbreviation][r.position] = parseInt(r.cnt);
  });
  
  console.log('\nPosition balance (sample teams):');
  ['CHI', 'LAL', 'BOS'].forEach(team => {
    console.log('  ' + team + ':', teamPositions[team]);
  });
  
  await pool.end();
}
test();
