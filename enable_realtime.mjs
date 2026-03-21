import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.production.local' })

async function run() {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    console.error("No DB URL found!")
    return
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()

  try {
    const res = await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE shared_order_applicants;`)
    console.log("Success:", res)
  } catch(e) {
    if (e.message.includes('already in publication')) {
      console.log('Table is already in publication.')
    } else {
      console.error('Error:', e)
    }
  }

  await client.end()
}

run()
