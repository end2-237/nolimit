import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔄 Initializing database...');

    // Read and execute migration files
    const migrationFiles = [
      '001-init-schema.sql',
      '002-seed-data.sql',
    ];

    for (const file of migrationFiles) {
      const filePath = join(__dirname, '..', 'migrations', file);
      console.log(`📝 Running migration: ${file}`);

      try {
        const sql = readFileSync(filePath, 'utf-8');
        
        // Split by semicolon and filter empty statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          await pool.query(statement);
        }

        console.log(`✅ ${file} completed`);
      } catch (error: any) {
        // Some migrations might fail if they already exist
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${file} already applied (skipping)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Database initialized successfully!');
    console.log('\n📊 You can now use these test credentials:');
    console.log('  Admin:    admin@nolimit.com / password');
    console.log('  Manager:  manager@nolimit.com / password');
    console.log('  Operator: operator1@nolimit.com / password');
    console.log('           operator2@nolimit.com / password');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
