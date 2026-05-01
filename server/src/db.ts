import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB] Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('[DB] Query failed', { text, error });
    throw error;
  }
}

export async function getClient() {
  return pool.connect();
}

export async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('[DB] Connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    return false;
  }
}

export default pool;
