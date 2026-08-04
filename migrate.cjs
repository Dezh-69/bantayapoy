const { Client } = require('pg');
const fs = require('fs');

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://postgres:reallyreallystrongpassword_@db.ejtgeqtimzqjdjprrsgc.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    const sql = fs.readFileSync('supabase/migrations/20260717000000_init.sql', 'utf8');
    await client.query(sql);
    console.log('Migration successful');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
