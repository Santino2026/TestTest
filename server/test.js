const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hoops:hoops123@localhost:5432/sportsleagueoffice'
});

async function test() {
  try {
    console.log('Connected to PostgreSQL database');
    
    // Get a test franchise
    const franchiseResult = await pool.query(
      "SELECT f.*, s.status as season_status FROM franchises f JOIN seasons s ON f.season_id = s.id WHERE f.phase = 'preseason' LIMIT 1"
    );
    
    if (franchiseResult.rows.length === 0) {
      console.log('No franchise in preseason phase found');
      return;
    }
    
    const franchise = franchiseResult.rows[0];
    console.log('Phase:', franchise.phase);
    console.log('Current day:', franchise.current_day);
    
    console.log('\nTesting HTTP endpoint...');
    
    // Test single day simulation timing
    const start = Date.now();
    const response = await fetch('http://localhost:3001/api/preseason', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiN2NiOGM4ZS02MDFkLTQ0YTctOGQyNS1kYzZkYmJhNDdiNjciLCJwYWlkIjp0cnVlLCJpYXQiOjE3MzgxNDQxMTksImV4cCI6MTczODIzMDUxOX0.2EEA1yjQUcPSc1uevv_nqsxFqXVuMj8HdHlnr1G2xrg'
      }
    });
    const elapsed = Date.now() - start;
    const data = await response.json();
    
    if (response.ok) {
      console.log(`Day ${franchise.current_day} -> ${data.day}: ${data.games_played} games in ${elapsed}ms`);
      console.log('User game result:', data.user_game_result ? (data.user_game_result.won ? 'WIN' : 'LOSS') : 'No user game');
    } else {
      console.log('Error:', data.error);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
