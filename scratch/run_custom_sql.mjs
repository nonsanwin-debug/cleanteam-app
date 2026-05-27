import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const DB_URL = "postgresql://postgres.nmrhxvtcvcbcnaeonvsd:qwas13579qwas@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"

async function run() {
  const client = new pg.Client({ 
    connectionString: DB_URL
  })
  try {
    await client.connect()
    
    const sql = `
      ALTER TABLE public.platform_settings 
      ADD COLUMN IF NOT EXISTS hide_wallet_features boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS hide_admin_photo_zone_setup boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS hide_cleaning_fee_examples boolean DEFAULT false;
    `;
    
    await client.query(sql)
    console.log("SQL executed successfully to add feature flags columns.")
  } catch (err) {
    console.error("Failed to run SQL:", err)
  } finally {
    await client.end()
  }
}

run()
