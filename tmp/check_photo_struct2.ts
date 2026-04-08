import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
    const { data: sites } = await supabase
        .from('sites')
        .select('*')
        .or('address.ilike.%천안%,address.ilike.%아산%')
        .order('created_at', { ascending: false })
        .limit(2)
    
    fs.writeFileSync('C:/Users/UserPC/Desktop/cleanteam/tmp/photo_struct.json', JSON.stringify(sites, null, 2), 'utf8')
}

check()
