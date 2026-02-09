
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PROJECT_REF = "zfaagizkdixopldhqixv";
const PASS = "qwas13579qwas";
const HOST = "aws-0-us-east-1.pooler.supabase.com"; // Pooler
const DB_URL = `postgresql://postgres.${PROJECT_REF}:${PASS}@${HOST}:6543/postgres?sslmode=require`;

const OUTPUT_FILE = path.resolve(__dirname, 'recovered_schema.sql');

async function dumpDDL() {
    console.log("Connecting to DB for Introspection...");
    console.log("URL:", DB_URL);

    // Explicitly set verify logic to avoid Node warnings if possible, but rejectUnauthorized: false is enough
    const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log("Connected successfully.");

        let sql = `-- Auto-generated Schema Dump\n-- Generated at ${new Date().toISOString()}\n\n`;

        // 1. Fetch Enums
        console.log("Fetching Enums...");
        const enumsRes = await client.query(`
            SELECT t.typname, e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public'
            ORDER BY t.typname, e.enumsortorder;
        `);

        const enums: Record<string, string[]> = {};
        enumsRes.rows.forEach(row => {
            if (!enums[row.typname]) enums[row.typname] = [];
            enums[row.typname].push(row.enumlabel);
        });

        for (const [name, values] of Object.entries(enums)) {
            console.log(`  -> Enum: ${name}`);
            sql += `DO $$ BEGIN CREATE TYPE "${name}" AS ENUM (${values.map((v: string) => `'${v}'`).join(', ')}); EXCEPTION WHEN duplicate_object THEN null; END $$;\n`;
        }
        sql += `\n`;

        // 2. Fetch Tables (Public Only)
        console.log("Fetching Table List...");
        const tablesRes = await client.query(`
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('schema_migrations', 'supabase_migrations')
            ORDER BY table_name;
        `);

        console.log(`Found ${tablesRes.rows.length} public tables.`);

        for (const table of tablesRes.rows) {
            const fullTableName = `${table.table_schema}.${table.table_name}`;
            console.log(`Processing ${fullTableName}...`);

            sql += `CREATE TABLE IF NOT EXISTS ${table.table_schema}."${table.table_name}" (\n`;

            // Columns
            const colsRes = await client.query(`
                SELECT column_name, data_type, udt_name, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = $1 AND table_name = $2
                ORDER BY ordinal_position;
            `, [table.table_schema, table.table_name]);

            const colDefs = [];
            for (const col of colsRes.rows) {
                let type = col.data_type;
                if (type === 'USER-DEFINED') {
                    type = `"${col.udt_name}"`; // Enum type
                } else if (type === 'ARRAY') {
                    if (col.udt_name.startsWith('_')) {
                        type = `${col.udt_name.substring(1)}[]`;
                    } else {
                        type = 'text[]';
                    }
                }

                // Fix: JSONB type might be 'USER-DEFINED' in some contexts or standard
                // Use udt_name if data_type is generic
                if (type === 'USER-DEFINED' && col.udt_name === 'geometry') {
                    // skip geometry or handle it? we don't use it.
                }

                let def = `  "${col.column_name}" ${type}`;
                if (col.is_nullable === 'NO') def += ' NOT NULL';
                if (col.column_default) def += ` DEFAULT ${col.column_default}`;

                colDefs.push(def);
            }

            // Primary Keys
            const pkRes = await client.query(`
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_schema = $1
                  AND tc.table_name = $2;
            `, [table.table_schema, table.table_name]);

            if (pkRes.rows.length > 0) {
                const pkCols = pkRes.rows.map(r => `"${r.column_name}"`).join(', ');
                colDefs.push(`  PRIMARY KEY (${pkCols})`);
            }

            sql += colDefs.join(',\n');
            sql += `\n);\n\n`;
            console.log(`  -> Processed ${table.table_name}`);
        }

        fs.writeFileSync(OUTPUT_FILE, sql);
        console.log(`Schema dumped to ${OUTPUT_FILE}`);
        console.log("Content Preview:", sql.substring(0, 200));

    } catch (err) {
        console.error("DDL Dump Failed Main Block:", err);
    } finally {
        await client.end();
        console.log("Client Disconnected");
    }
}

dumpDDL();
