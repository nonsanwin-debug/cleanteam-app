
import { Client } from 'pg';

// NEW DB (Seoul) - Pooler
const PROJECT_REF = "nmrhxvtcvcbcnaeonvsd";
const PASS = "qwas13579qwas";
const POOLER_HOST = "aws-0-ap-northeast-2.pooler.supabase.com";
const DB_URL = `postgresql://postgres.${PROJECT_REF}:${PASS}@${POOLER_HOST}:6543/postgres?sslmode=require`;

async function checkUsers() {
    const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();

        console.log("Checking auth.users...");
        const res = await client.query('SELECT count(*) FROM auth.users');
        console.log(`Auth Users Count: ${res.rows[0].count}`);

        if (parseInt(res.rows[0].count) > 0) {
            const user = await client.query('SELECT email, encrypted_password, confirmed_at FROM auth.users LIMIT 1');
            console.log('Sample User:', user.rows[0]);
        }

    } catch (err: any) {
        console.error("Check Failed:", err.message);
    } finally {
        await client.end();
    }
}

checkUsers();
