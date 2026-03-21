import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
    console.log("Checking for nexus broker...");
    const { data: users, error } = await supabase.from('users').select('id, name, email, role, company_id').ilike('name', '%넥서스%')
    console.log("Users:", users)
}
check()
