const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/synap?schema=public' });

async function run() {
  await pool.query('DELETE FROM "Nota";');
  await pool.query('DELETE FROM "Pasta";');
  await pool.query('DELETE FROM "User";');
  console.log('Cleared');
  process.exit(0);
}
run();
