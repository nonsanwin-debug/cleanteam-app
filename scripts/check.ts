import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim()

const supabase = createClient(url!, key!)
supabase.from('shared_orders').select('*, accepted_company:accepted_by(name, code), applicants:shared_order_applicants(*)').ilike('region', '%배방%').order('created_at', { ascending: false }).limit(1).single()
.then(res => {
    fs.writeFileSync('order_output.json', JSON.stringify(res.data, null, 2))
    console.log("Done")
})
