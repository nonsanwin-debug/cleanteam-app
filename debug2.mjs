import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function debugOrder() {
    const { data: orders } = await supabase
        .from('shared_orders')
        .select('*, accepted_company:accepted_by(name, code), transferred_site:transferred_site_id(status, payment_status)')
        .order('created_at', { ascending: false })
        .limit(2)

    console.log(JSON.stringify(orders, null, 2))
    fs.writeFileSync('debug2.json', JSON.stringify({ orders }, null, 2))
}

debugOrder()
