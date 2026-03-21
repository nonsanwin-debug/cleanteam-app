import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkTriggers() {
    const { data } = await supabase.rpc('execute_sql', { 
        query: `SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers WHERE event_object_table IN ('shared_orders', 'shared_order_applicants');` 
    })
    console.log("Triggers:", data)
}
checkTriggers()
