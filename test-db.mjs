import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
    const { data: partners, error } = await supabase
        .from('users')
        .select(`
            id, name, phone, email, role, status, created_at, account_info, current_money, 
            companies(id, name, code, status, points, booking_points, benefits)
        `)
        .eq('role', 'partner')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
        
    console.log('Error:', error);
    console.log('Partners:', partners ? partners.length : null);
}
test()
