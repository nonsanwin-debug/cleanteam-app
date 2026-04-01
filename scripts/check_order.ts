import { createAdminClient } from './src/lib/supabase/admin'

async function check() {
    const supabase = createAdminClient()
    const { data: order } = await supabase
        .from('shared_orders')
        .select('*, accepted_company:accepted_by(name, code), transferred_site:transferred_site_id(*)')
        .ilike('region', '%충남 아산시 배방읍%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    
    console.log(JSON.stringify(order, null, 2))
}

check()
