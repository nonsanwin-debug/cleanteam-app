import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function debugOrder() {
    const { data: orders } = await supabase
        .from('shared_orders')
        .select('id, status, accepted_by, address, transferred_site_id, created_at')
        .order('created_at', { ascending: false })
        .limit(2)

    const { data: sites } = await supabase
        .from('sites')
        .select('id, name, address, cleaning_date, created_at, status')
        .order('created_at', { ascending: false })
        .limit(2)
        
    fs.writeFileSync('debug.json', JSON.stringify({ orders, sites }, null, 2))
    console.log("Saved to debug.json")
}

debugOrder()
