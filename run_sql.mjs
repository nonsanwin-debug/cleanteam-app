import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env.local') })

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error("No DATABASE_URL found. Please use the Supabase SQL Editor manually based on the implementation_plan.md instructions.")
  process.exit(1)
}

async function run() {
  const client = new pg.Client({ connectionString: dbUrl })
  try {
    await client.connect()
    const sql = fs.readFileSync(path.join(__dirname, 'update_inquiry_type.sql'), 'utf-8')
    await client.query(sql)
    console.log("SQL executed successfully.")
  } catch (err) {
    console.error("Failed to run SQL:", err)
  } finally {
    await client.end()
  }
}

run()
