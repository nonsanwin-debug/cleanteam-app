import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FieldHomeClient } from './home-client'
import { getMySharedOrders } from '@/actions/shared-orders'

export const dynamic = 'force-dynamic'

export default async function FieldHomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/partner-login')
    }

    // Fetch user profile to get partner name
    const { data: profile } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'partner') {
        redirect('/auth/partner-login')
    }

    const myOrders = await getMySharedOrders()
    
    // 진행중인 오더 계산: open (대기중), accepted (정보대기), transferred (진행중/완료)
    // 좀 더 자세히는 transferred일 때 transferred_site의 상태가 'completed'가 아닌 것
    const ongoingOrdersCount = myOrders.filter(order => {
        if (['open', 'accepted'].includes(order.status)) return true
        if (order.status === 'transferred') {
            // If it's transferred but not completed entirely
            return order.transferred_site?.status !== 'completed'
        }
        return false
    }).length

    return <FieldHomeClient 
        partnerName={profile.name} 
        ongoingCount={ongoingOrdersCount} 
        recentOrders={myOrders.slice(0, 3)} 
    />
}
