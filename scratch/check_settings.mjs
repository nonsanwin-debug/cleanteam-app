import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const DB_URL = "postgresql://postgres.nmrhxvtcvcbcnaeonvsd:qwas13579qwas@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"

async function run() {
  const client = new pg.Client({ 
    connectionString: DB_URL
  })
  try {
    await client.connect()
    
    const res = await client.query('SELECT * FROM public.platform_settings LIMIT 1;')
    console.log("Current platform settings row:", res.rows[0])
  } catch (err) {
    console.error("Failed to run SQL:", err)
  } finally {
    await client.end()
  }
}

run()
