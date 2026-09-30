/**
 * APRA Database Setup Script
 * --------------------------
 * Reads schema.sql and creates all tables in Supabase PostgreSQL.
 * Run once: node scripts/setup-db.js
 *
 * Prerequisites:
 *   - DATABASE_URL set in backend/.env
 *   - Get it from: Supabase Dashboard → Settings → Database → Connection string (URI)
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_FILE = path.join(__dirname, '..', 'config', 'schema.sql');

async function setupDatabase() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]')) {
    console.error('❌ DATABASE_URL is not set in your .env file!');
    console.error('');
    console.error('Steps to fix:');
    console.error('  1. Open Supabase Dashboard → Settings → Database');
    console.error('  2. Scroll to "Connection string" → select URI tab');
    console.error('  3. Copy the URL and replace [YOUR-PASSWORD] with your real DB password');
    console.error('  4. Paste into backend/.env as DATABASE_URL=...');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // required for Supabase
  });

  try {
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Read schema.sql
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    console.log('📄 Running schema.sql ...\n');

    // Execute the entire schema
    await client.query(sql);

    console.log('');
    console.log('🎉 Database setup complete! Tables created:');
    console.log('   ✅ association_info');
    console.log('   ✅ association_heads  (pre-filled with 12 office bearers)');
    console.log('   ✅ members');
    console.log('   ✅ family_members');
    console.log('');
    console.log('🚀 Your APRA database is ready!');

    // Quick verification — count rows in association_heads
    const { rows } = await client.query('SELECT COUNT(*) FROM association_heads');
    console.log(`📋 association_heads has ${rows[0].count} rows (expected 12)`);

  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    if (err.message.includes('password')) {
      console.error('   → Check your DATABASE_URL password in .env');
    }
    if (err.message.includes('ECONNREFUSED') || err.message.includes('timeout')) {
      console.error('   → Check your internet connection or Supabase project status');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
