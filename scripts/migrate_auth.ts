
import { Client } from 'pg';
import * as fs from 'fs';

// OLD DB (Source) - Pooler (US East 1)
const OLD_PROJECT = "zfaagizkdixopldhqixv";
const OLD_PASS = "qwas13579qwas";
const OLD_HOST = "aws-0-us-east-1.pooler.supabase.com";
const OLD_DB_URL = `postgresql://postgres.${OLD_PROJECT}:${OLD_PASS}@${OLD_HOST}:6543/postgres?sslmode=require`;

// NEW DB (Seoul) - Pooler
const NEW_PROJECT = "nmrhxvtcvcbcnaeonvsd";
const NEW_PASS = "qwas13579qwas";
const POOLER_HOST = "aws-0-ap-northeast-2.pooler.supabase.com";
const NEW_DB_URL = `postgresql://postgres.${NEW_PROJECT}:${NEW_PASS}@${POOLER_HOST}:6543/postgres?sslmode=require`;

async function migrateAuth() {
    console.log("Migrating Auth Users...");

    // 1. Connect
    const oldClient = new Client({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

    try {
        fs.appendFileSync('migration_debug.log', "Connecting to Old DB...\n");
        await oldClient.connect();
        fs.appendFileSync('migration_debug.log', "Connected to Old DB\n");

        fs.appendFileSync('migration_debug.log', "Connecting to New DB...\n");
        await newClient.connect();
        fs.appendFileSync('migration_debug.log', "Connected to New DB\n");

        // 2. Fetch Old Users
        const res = await oldClient.query('SELECT * FROM auth.users');
        console.log(`Found ${res.rows.length} users in Old DB`);

        if (res.rows.length === 0) return;

        // 3. Insert into New DB
        // We need to disable triggers? No, usually fine.
        // But we must handle 'id' conflict.

        for (const user of res.rows) {
            console.log(`Migrating user: ${user.email} (${user.id})`);

            // Construct columns dynamically
            const columns = Object.keys(user).map(k => `"${k}"`).join(', ');
            const values = Object.values(user);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            const query = `
                INSERT INTO auth.users (${columns}) 
                VALUES (${placeholders})
                ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    encrypted_password = EXCLUDED.encrypted_password,
                    updated_at = EXCLUDED.updated_at
            `;

            try {
                await newClient.query(query, values);
                console.log(`  -> Success`);
            } catch (err: any) {
                console.error(`  -> Failed: ${err.message}`);
            }
        }

    } catch (err: any) {
        console.error("Migration Failed:", err.message);
        fs.writeFileSync('migration_error.log', err.message);
    } finally {
        await oldClient.end();
        await newClient.end();
    }
}

migrateAuth();
