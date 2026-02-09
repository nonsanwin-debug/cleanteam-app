
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// OLD DB (Source) - Pooler (US East 1)
const OLD_PROJECT = "zfaagizkdixopldhqixv";
const OLD_PASS = "qwas13579qwas";
const OLD_HOST = "aws-0-us-east-1.pooler.supabase.com";
const OLD_DB_URL = `postgresql://postgres.${OLD_PROJECT}:${OLD_PASS}@${OLD_HOST}:6543/postgres?sslmode=require`;

// NEW DB (Target) - Direct (Seoul)
const NEW_PROJECT = "nmrhxvtcvcbcnaeonvsd";
const NEW_PASS = "qwas13579qwas";
// Use Direct connection for Schema operations (DDL)
const NEW_DB_URL = `postgresql://postgres:${NEW_PASS}@db.nmrhxvtcvcbcnaeonvsd.supabase.co:5432/postgres?sslmode=require`;

// Migration Files in Order
const MIGRATION_FILES = [
    'supabase_schema.sql', // Base
    'signup_fix.sql', // Triggers
    'migration_add_site_details.sql',
    'migration_add_template_id.sql',
    'add_payment_schema.sql', // Core payment columns
    'payment_enhancement.sql', // Withdrawal & Claims
    'as_management.sql', // AS System
    'add_worker_name_column.sql',
    'add_worker_phone_column.sql',
    'alter_sites_add_timestamps.sql',
    'add_special_photo_type.sql',
    'fix_checklist_columns.sql',
    'fix_checklist_constraint.sql',
    'fix_photos_type_constraint.sql',
    'fix_worker_action_v3.sql', // Functions 
    'fix_permissions_final.sql', // Policies
    'enable_realtime.sql'
];

const TABLES_TO_MIGRATE = [
    { schema: 'auth', name: 'users' },
    { schema: 'auth', name: 'identities' },
    { schema: 'public', name: 'users' }, // Profiles
    { schema: 'public', name: 'checklist_templates' },
    { schema: 'public', name: 'sites' },
    { schema: 'public', name: 'photos' },
    { schema: 'public', name: 'checklist_submissions' },
    { schema: 'public', name: 'withdrawal_requests' }
];

async function migrate() {
    console.log("=== Starting Full Migration ===");

    // 1. Connect
    const oldClient = new Client({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
    const newClient = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

    try {
        await oldClient.connect();
        console.log("Connected to OLD DB");
    } catch (e) {
        console.error("Failed to connect to OLD DB:", e);
        return;
    }

    try {
        await newClient.connect();
        console.log("Connected to NEW DB");
    } catch (e) {
        console.error("Failed to connect to NEW DB:", e);
        return;
    }

    try {
        // 2. Apply Schema
        console.log("\n--- Applying Schema ---");
        // Disable triggers/fk checks locally for the session? 
        // Postgres: SET session_replication_role = 'replica'; 
        // useful for data, but for schema creation we need Origin?
        // Let's use replica for everything to speed up and avoid trigger noise.
        await newClient.query("SET session_replication_role = 'replica';"); // Important!

        const rootDir = path.resolve(__dirname, '..');

        for (const file of MIGRATION_FILES) {
            console.log(`Applying ${file}...`);
            const filePath = path.join(rootDir, file);
            if (!fs.existsSync(filePath)) {
                console.warn(`  -> File not found: ${file} (Skipping but might causes issues)`);
                continue;
            }
            const sql = fs.readFileSync(filePath, 'utf-8');
            try {
                // Split by ';' if needed? simple query usually works for multi-statement scripts in pg node driver?
                // node-pg can run multi-statement if valid.
                await newClient.query(sql);
            } catch (err: any) {
                console.error(`  -> Error applying ${file}:`, err.message);
                // We continue, because some errors might be "already exists"
            }
        }

        console.log("Schema Application Done.");

        // 3. Migrate Data
        console.log("\n--- Migrating Data ---");

        for (const table of TABLES_TO_MIGRATE) {
            console.log(`Migrating ${table.schema}.${table.name}...`);

            // Fetch
            const res = await oldClient.query(`SELECT * FROM ${table.schema}.${table.name}`);
            const rows = res.rows;
            console.log(`  -> Found ${rows.length} rows.`);

            if (rows.length === 0) continue;

            const columns = Object.keys(rows[0]).map(k => `"${k}"`).join(', ');

            let successCount = 0;
            for (const row of rows) {
                const values = Object.values(row);
                // Simple placeholder generation
                const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

                // Construct INSERT
                // For 'public.users', we want to UPDATE if exists (because trigger might have created it empty)
                // Actually session_replication_role = 'replica' DISABLES triggers!
                // So triggers won't fire during INSERT. 
                // So ON CONFLICT DO NOTHING is safe for duplication, but pure INSERT is expected.
                // We use Upsert logic just in case.

                const query = `
                    INSERT INTO ${table.schema}.${table.name} (${columns}) 
                    VALUES (${placeholders})
                    ON CONFLICT DO NOTHING
                `;

                try {
                    await newClient.query(query, values);
                    successCount++;
                } catch (e: any) {
                    // Ignore duplicate key error silently?
                    // console.error(`  -> Insert failed:`, e.message);
                    if (!e.message.includes("duplicate key")) {
                        console.error(`  -> Insert Error: ${e.message}`);
                    }
                }
            }
            console.log(`  -> Migrated ${successCount}/${rows.length} rows.`);
        }

        // 4. Reset Sequence (Optional but good)
        // Auto-detect serials? Skipping for now.

        // 5. Restore Session Role
        await newClient.query("SET session_replication_role = 'origin';");
        console.log("\nMigration Complete! Triggers Re-enabled.");

    } catch (err) {
        console.error("Migration Fatal Error:", err);
    } finally {
        await oldClient.end();
        await newClient.end();
    }
}

migrate();
