import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Read from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const dbUrl = envConfig.DATABASE_URL || process.env.DATABASE_URL;

async function run() {
    console.log("Connecting to DB:", dbUrl?.split('@')[1]); // Safe logging
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    
    try {
        await client.connect();
        const res = await client.query(`SELECT id, name, code, owner_id FROM public.companies ORDER BY created_at DESC LIMIT 20`);
        console.table(res.rows);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
run();
