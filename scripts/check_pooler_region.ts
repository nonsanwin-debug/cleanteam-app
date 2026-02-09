
import { Client } from 'pg';

const PROJECT_REF = "nmrhxvtcvcbcnaeonvsd";
const PASS = "qwas13579qwas";

const REGIONS = [
    "aws-0-us-east-1",       // N. Virginia
    "aws-0-ap-northeast-2",  // Seoul
    "aws-0-ap-northeast-1",  // Tokyo
    "aws-0-ap-southeast-1",  // Singapore
    "aws-0-us-west-1",       // N. California
    "aws-0-eu-central-1",    // Frankfurt
    "aws-0-eu-west-1",       // Ireland
    "aws-0-eu-west-2",       // London
    "aws-0-ap-southeast-2",  // Sydney
    "aws-0-sa-east-1",       // Sao Paulo
    "aws-0-ca-central-1",    // Canada
    "aws-0-ap-south-1",      // Mumbai
];

async function checkRegion() {
    console.log(`Checking regions for project: ${PROJECT_REF}`);

    for (const region of REGIONS) {
        const host = `${region}.pooler.supabase.com`;
        // Try Transaction Mode (6543) first as it's common for migration
        const dbUrl = `postgresql://postgres.${PROJECT_REF}:${PASS}@${host}:6543/postgres?sslmode=require`;

        console.log(`Trying ${region}...`);
        const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });

        try {
            await client.connect();
            console.log(`✅ SUCCESS: Connected to ${region}`);
            await client.end();
            return; // Found!
        } catch (err: any) {
            // console.log(`  -> Failed: ${err.message}`);
            if (err.message.includes("Tenant or user not found")) {
                // Expected failure for wrong region
            } else {
                console.log(`  -> Error: ${err.message}`);
            }
            await client.end();
        }
    }
    console.log("❌ All regions failed.");
}

checkRegion();
