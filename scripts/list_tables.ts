
import { Client } from 'pg';

// Attempt 1: Default
// const OLD_DB_URL = "postgresql://postgres:qwas13579qwas@db.zfaagizkdixopldhqixv.supabase.co:5432/postgres";

// Attempt 2: Pooler (US East 1 - Common default)
// User: postgres.PROJECT_REF
// Pass: PASSWORD
// Host: aws-0-us-east-1.pooler.supabase.com
// Port: 6543
const PROJECT_REF = "zfaagizkdixopldhqixv";
const PASS = "qwas13579qwas";
const POOLER_HOST = "aws-0-us-west-1.pooler.supabase.com"; // Try US West

// Construct connection string for pooler
// Note: Transaction mode is safer for migration but Session mode needed for some ops? 
// Pooler usually supports transaction mode on port 6543.
const OLD_DB_URL = `postgresql://postgres.${PROJECT_REF}:${PASS}@${POOLER_HOST}:6543/postgres?sslmode=require`;

import * as fs from 'fs';

async function listTables() {
  console.log("Connecting to Pooler:", POOLER_HOST);
  fs.writeFileSync('list_tables_debug.log', `Connecting to Pooler: ${POOLER_HOST}\n`);

  const client = new Client({
    connectionString: OLD_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Pooler! Fetching tables...");
    fs.appendFileSync('list_tables_debug.log', "Connected to Pooler! Fetching tables...\n");

    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('public', 'auth') 
      AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name;
    `);

    console.log("Tables found:");
    fs.appendFileSync('list_tables_debug.log', `Tables found: ${res.rows.length}\n`);
    res.rows.forEach(row => fs.appendFileSync('list_tables_debug.log', `${row.table_schema}.${row.table_name}\n`));

  } catch (err: any) {
    console.error('Pooler Connection Error:', err);
    fs.appendFileSync('list_tables_debug.log', `Pooler Connection Error: ${err.message}\n`);
  } finally {
    await client.end();
  }
}

listTables();
