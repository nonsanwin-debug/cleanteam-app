const fs = require('fs');
const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PROJECT_REF = "zfaagizkdixopldhqixv";
const PASS = "qwas13579qwas";
const POOLER_HOST = "aws-0-us-west-1.pooler.supabase.com"; // From list_tables.ts
const DB_URL = `postgresql://postgres.${PROJECT_REF}:${PASS}@${POOLER_HOST}:6543/postgres?sslmode=require`;

async function run() {
    const client = new Client({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB!");
        const sql = fs.readFileSync('setup_memos.sql', 'utf8');
        await client.query(sql);
        console.log("Successfully applied setup_memos.sql");
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await client.end();
    }
}

run();
