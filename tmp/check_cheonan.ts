import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
    console.log("=== Sites Table (천안, 아산) ===")
    const { data: sites, error: sitesErr } = await supabase
        .from('sites')
        .select('*')
        .or('address.ilike.%천안%,address.ilike.%아산%')
        .order('created_at', { ascending: false })
        .limit(10)
    
    if (sitesErr) console.error("Sites Error: ", sitesErr)
    console.log(`Found ${sites?.length || 0} sites.`)
    if (sites?.length) sites.forEach(s => console.log(s.name, s.address, s.work_date))

    console.log("\n=== Shared Orders Table (천안, 아산) ===")
    const { data: orders, error: ordersErr } = await supabase
        .from('shared_orders')
        .select('*')
        .or('region.ilike.%천안%,region.ilike.%아산%,address.ilike.%천안%,address.ilike.%아산%')
        .order('created_at', { ascending: false })
        .limit(10)
    
    if (ordersErr) console.error("Orders Error: ", ordersErr)
    console.log(`Found ${orders?.length || 0} shared orders.`)
    if (orders?.length) orders.forEach(o => console.log(o.region, o.address, o.work_date))
}

check()
