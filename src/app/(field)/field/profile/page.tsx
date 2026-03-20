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
        .select('name, email, phone, role')
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
    
    // Estimate transparent revenue tracking based on completed order counts
    // For placeholder purposes: Partner commission = ~30,000 KRW per successful order
    const estimatedRevenue = completedOrders.length * 30000

    return <FieldProfileClient 
        profile={{...profile, id: user.id}} 
        stats={{
            totalCompleted: completedOrders.length,
            estimatedRevenue
        }} 
    />
}
