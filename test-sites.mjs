import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
    const { data: sites, error } = await supabase
        .from('sites')
        .select('*')
        .limit(1)
        
    console.log('Sites:', sites ? Object.keys(sites[0]) : error);
}
test()
