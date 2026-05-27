import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const DB_URL = "postgresql://postgres.zfaagizkdixopldhqixv:qwas13579qwas@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

async function run() {
  const client = new pg.Client({ 
    connectionString: DB_URL
  })
  try {
    await client.connect()
    console.log("Connected to zfaagizkdixopldhqixv successfully!")
    const res = await client.query('SELECT * FROM public.platform_settings LIMIT 1;')
    console.log("zfa platform settings:", res.rows[0])
  } catch (err) {
    console.error("Failed to connect to zfa:", err.message)
  } finally {
    await client.end()
  }
}

run()
