import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
    const { data: orders, error } = await supabase
        .from('shared_orders')
        .select('*, accepted_company:accepted_by(name, code), transferred_site:transferred_site_id(id, status, payment_status, date, worker:worker_id(name))')
        .limit(1)
        
    console.log('Test 1 (with date):', error);
    
    const { data: orders2, error: error2 } = await supabase
        .from('shared_orders')
        .select('*, accepted_company:accepted_by(name, code), transferred_site:transferred_site_id(id, status, payment_status, work_date, worker:worker_id(name))')
        .limit(1)
    
    console.log('Test 2 (with work_date):', error2);
}
test()
