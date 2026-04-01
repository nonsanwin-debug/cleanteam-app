import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    })
    await client.connect()
    const res = await client.query(`
        SELECT * FROM shared_orders 
        WHERE region LIKE '%배방%' 
        ORDER BY created_at DESC LIMIT 1
    `)
    console.log(JSON.stringify(res.rows[0], null, 2))
    await client.end()
}
check()
