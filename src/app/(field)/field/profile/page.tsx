import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FieldProfileClient } from './profile-client'
import { getMySharedOrders } from '@/actions/shared-orders'

export const dynamic = 'force-dynamic'

export default async function FieldProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/partner-login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('name, email, phone, role, company_id')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'partner') {
        redirect('/auth/partner-login')
    }

    // Get orders to calculate stats
    const myOrders = await getMySharedOrders()
    const completedOrders = myOrders.filter(order => 
        order.status === 'transferred' && order.transferred_site?.status === 'completed'
    )
    
    // Fetch actual points from company
    let currentPoints = 0
    if (profile?.company_id) {
        // Use service role key to bypass RLS for points if needed or just use normal if RLS allows
        const supabaseAdmin = await import('@supabase/ssr').then(m => m.createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )).catch(() => supabase)
        
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('points')
            .eq('id', profile.company_id)
            .single()
        currentPoints = company?.points || 0
    }

    return <FieldProfileClient 
        profile={{...profile, id: user.id}} 
        stats={{
            totalCompleted: completedOrders.length,
            estimatedRevenue: currentPoints
        }} 
    />
}
