
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_REF = "nmrhxvtcvcbcnaeonvsd";
const PASS = "qwas13579qwas";

// Direct Connection (IPv6 Bypass)
const DB_URL = `postgresql://postgres.${PROJECT_REF}:${PASS}@[2406:da12:b78:de0f:411a:ed76:6a09:d2e9]:5432/postgres?sslmode=require`;

async function apply() {
    console.log("Applying Multi-tenancy Schema...");
    const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log("Connected.");
        fs.writeFileSync('apply_debug.log', "Connected.\n");

        const sql = fs.readFileSync(path.join(__dirname, '..', 'multi_tenancy_schema.sql'), 'utf-8');

        // Truncate might fail if tables don't exist, so we might need simple error handling or ensure updated schema
        await client.query(sql);
        console.log("Schema Applied Successfully.");
        fs.appendFileSync('apply_debug.log', "Schema Applied Successfully.\n");

    } catch (err: any) {
        console.error("Apply Failed:", err.message);
        fs.writeFileSync('apply_debug.log', `Apply Failed: ${err.message}\n`);
    } finally {
        await client.end();
    }
}

apply();
