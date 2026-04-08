import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
    console.log("Querying...")
    const { data: sites } = await supabase
        .from('sites')
        .select('*')
        .or('address.ilike.%천안%,address.ilike.%아산%')
        .order('created_at', { ascending: false })
        .limit(10)

    const { data: orders } = await supabase
        .from('shared_orders')
        .select('*')
        .or('region.ilike.%천안%,region.ilike.%아산%,address.ilike.%천안%,address.ilike.%아산%')
        .order('created_at', { ascending: false })
        .limit(10)
    
    fs.writeFileSync('C:/Users/UserPC/Desktop/cleanteam/tmp/cheonan_clean.json', JSON.stringify({
        sites_found: sites?.length || 0,
        sites: sites?.map(s => ({ name: s.name, address: s.address, date: s.work_date })),
        shared_orders_found: orders?.length || 0,
        shared_orders: orders?.map(o => ({ region: o.region, address: o.address, date: o.work_date }))
    }, null, 2), 'utf8')
    console.log("Done. Wrote to tmp/cheonan_clean.json")
}

check()
