import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PROJECT_REF = "nmrhxvtcvcbcnaeonvsd";
const PASS = "qwas13579qwas";

const REGIONS = [
    "aws-0-us-east-1",       // N. Virginia
    "aws-0-us-east-2",
    "aws-0-us-west-1",       // N. California
    "aws-0-us-west-2",
    "aws-0-ap-northeast-2",  // Seoul
    "aws-0-ap-northeast-1",  // Tokyo
    "aws-0-ap-southeast-1",  // Singapore
    "aws-0-ap-southeast-2",  // Sydney
    "aws-0-ap-south-1",      // Mumbai
    "aws-0-eu-central-1",    // Frankfurt
    "aws-0-eu-west-1",       // Ireland
    "aws-0-eu-west-2",       // London
    "aws-0-eu-west-3",       // Paris
    "aws-0-eu-north-1",
    "aws-0-sa-east-1",       // Sao Paulo
    "aws-0-ca-central-1",    // Canada
];

async function checkRegion() {
    console.log(`Checking regions for project: ${PROJECT_REF}`);

    for (const region of REGIONS) {
        const host = `${region}.pooler.supabase.com`;
        const dbUrl = `postgresql://postgres.${PROJECT_REF}:${PASS}@${host}:6543/postgres?sslmode=require`;

        console.log(`Trying ${region} (${host})...`);
        const client = new pg.Client({ 
            connectionString: dbUrl, 
            ssl: { rejectUnauthorized: false }, 
            connectionTimeoutMillis: 3000 
        });

        try {
            await client.connect();
            console.log(`✅ SUCCESS: Connected to ${region}`);
            await client.end();
            return; // Found!
        } catch (err) {
            console.log(`  -> Failed: ${err.message}`);
            await client.end().catch(() => {});
        }
    }
    console.log("❌ All regions failed.");
}

checkRegion();
