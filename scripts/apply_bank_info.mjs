process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Client } from 'pg';
import fs from 'fs';

const NEW_PROJECT = "nmrhxvtcvcbcnaeonvsd";
const NEW_PASS = "qwas13579qwas";
const POOLER_HOST = "aws-0-ap-northeast-2.pooler.supabase.com";
const NEW_DB_URL = `postgresql://postgres.${NEW_PROJECT}:${NEW_PASS}@${POOLER_HOST}:6543/postgres?sslmode=require`;

async function main() {
    const sql = fs.readFileSync('add_bank_info_to_users.sql', 'utf-8');
    
    console.log("Connecting to Seoul Pooler:", POOLER_HOST);
    const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log("Connected! Executing SQL...");
        await client.query(sql);
        console.log("SQL executed successfully!");
    } catch (err) {
        console.error("Verification Failed:", err);
    } finally {
        await client.end();
    }
}
main();
