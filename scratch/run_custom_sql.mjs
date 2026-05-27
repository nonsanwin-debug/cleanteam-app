import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const DB_URLS = [
  // 1. Seoul Pooler
  "postgresql://postgres.nmrhxvtcvcbcnaeonvsd:qwas13579qwas@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require",
  // 2. Direct Seoul (without db. prefix on 5432)
  "postgresql://postgres:qwas13579qwas@nmrhxvtcvcbcnaeonvsd.supabase.co:5432/postgres?sslmode=require",
  // 3. Direct Seoul on 6543
  "postgresql://postgres.nmrhxvtcvcbcnaeonvsd:qwas13579qwas@nmrhxvtcvcbcnaeonvsd.supabase.co:6543/postgres?sslmode=require",
  // 4. US West Pooler
  "postgresql://postgres.nmrhxvtcvcbcnaeonvsd:qwas13579qwas@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require",
  // 5. Direct DB host
  "postgresql://postgres:qwas13579qwas@db.nmrhxvtcvcbcnaeonvsd.supabase.co:5432/postgres?sslmode=require",
]

async function tryConnect(dbUrl) {
  console.log("Trying connection string:", dbUrl)
  const client = new pg.Client({ 
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  })
  try {
    await client.connect()
    console.log("Success! Connected to:", dbUrl)
    return client
  } catch (err) {
    console.warn("Failed:", err.message)
    await client.end().catch(() => {})
    return null
  }
}

async function run() {
  let client = null
  for (const url of DB_URLS) {
    client = await tryConnect(url)
    if (client) break
  }
  
  if (!client) {
    console.error("All connection attempts failed.")
    return
  }
  
  try {
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
