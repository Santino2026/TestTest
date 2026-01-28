import { pool } from './pool';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('🏀 Running migrations...\n');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`  📄 ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      await pool.query(sql);
      console.log(`     ✓ Success`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`     ⏭ Already exists, skipping`);
      } else {
        console.error(`     ✗ Error: ${error.message}`);
        throw error;
      }
    }
  }

  console.log('\n✅ Migrations complete!');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
