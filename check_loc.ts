import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    })
    await client.connect()
    
    console.log("=== Sites Table ===")
    const sitesRes = await client.query(`
        SELECT id, name, address, detail_address, status, work_date 
        FROM sites 
        WHERE address LIKE '%천안%' OR address LIKE '%아산%'
           OR detail_address LIKE '%천안%' OR detail_address LIKE '%아산%'
        ORDER BY work_date DESC 
        LIMIT 10
    `)
    console.log(`Found ${sitesRes.rowCount} sites in 천안/아산`)
    console.log(sitesRes.rows)

    console.log("\n=== Shared Orders Table ===")
    const ordersRes = await client.query(`
        SELECT id, region, address, detail_address, status, work_date 
        FROM shared_orders 
        WHERE region LIKE '%천안%' OR region LIKE '%아산%'
           OR address LIKE '%천안%' OR address LIKE '%아산%'
        ORDER BY work_date DESC 
        LIMIT 10
    `)
    console.log(`Found ${ordersRes.rowCount} shared orders in 천안/아산`)
    console.log(ordersRes.rows)

    await client.end()
}
check()
