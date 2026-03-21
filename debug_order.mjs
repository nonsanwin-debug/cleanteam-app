import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function debugOrder() {
    const { data: orders, error: ordersErr } = await supabase
        .from('shared_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

    if (ordersErr) console.error("Orders Error:", ordersErr)
    else console.log("Recent Shared Orders:", JSON.stringify(orders, null, 2))

    const { data: sites, error: sitesErr } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)
        
    if (sitesErr) console.error("Sites Error:", sitesErr)
    else console.log("Recent Sites:", JSON.stringify(sites, null, 2))
}

debugOrder()
