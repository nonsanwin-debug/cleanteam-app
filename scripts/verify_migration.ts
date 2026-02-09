
import { Client } from 'pg';

// NEW DB (Seoul) - Pooler
// Region: Korea (Seoul) -> aws-0-ap-northeast-2.pooler.supabase.com
const NEW_PROJECT = "nmrhxvtcvcbcnaeonvsd";
const NEW_PASS = "qwas13579qwas";
const POOLER_HOST = "aws-0-ap-northeast-2.pooler.supabase.com";
const NEW_DB_URL = `postgresql://postgres.${NEW_PROJECT}:${NEW_PASS}@${POOLER_HOST}:6543/postgres?sslmode=require`;

async function verify() {
    console.log("Connecting to Seoul Pooler:", POOLER_HOST);
    const client = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log("Connected!");

        const tables = ['users', 'sites', 'photos', 'checklist_templates'];
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT count(*) FROM public.${table}`);
                console.log(`Table '${table}': ${res.rows[0].count} rows`);
            } catch (e: any) {
                console.log(`Table '${table}': Error/Missing`, e.message);
            }
        }

    } catch (err) {
        console.error("Verification Failed:", err);
    } finally {
        await client.end();
    }
}

verify();
