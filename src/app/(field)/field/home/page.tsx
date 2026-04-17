import { createClient } from '@/lib/supabase/server'
import { FieldHomeClient } from './home-client'
import { getPartnerFeedSites } from '@/actions/partner-feed'
import { getActiveNotices } from '@/actions/partner-notices'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMySharedOrders } from '@/actions/shared-orders'

export const dynamic = 'force-dynamic'

export default async function FieldHomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let partnerName = ''
    let isLoggedIn = false
    let bookingCount = 0
    let bookingPoints = 0
    let activityPoints = 0

    if (user) {
        const { data: profile } = await supabase
            .from('users')
            .select('name, role, company_id')
            .eq('id', user.id)
            .single()

        if (profile?.role === 'partner') {
            partnerName = profile.name
            isLoggedIn = true

            if (profile.company_id) {
                const adminClient = createAdminClient()

                // 예약건수 조회
                const { count } = await adminClient
                    .from('shared_orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('partner_id', user.id)

                bookingCount = count || 0

                // 포인트 조회
                const { data: company } = await adminClient
                    .from('companies')
                    .select('points, booking_points')
                    .eq('id', profile.company_id)
                    .single()

                bookingPoints = company?.booking_points || 0
                activityPoints = company?.points || 0
            }
        }
    }

    const [feedSites, notices, myOrders] = await Promise.all([
        getPartnerFeedSites(),
        getActiveNotices(),
        getMySharedOrders(),
    ])

    // 내 오더 진행 중 건수 (완료되지 않은 것)
    const ongoingOrderCount = myOrders.filter((order: any) => {
        if (order.status === 'deleted') return false
        const isDone = order.status === 'transferred' && order.transferred_site?.status === 'completed'
        return !isDone
    }).length

    return <FieldHomeClient 
        partnerName={partnerName}
        partnerId={user?.id || ''}
        feedSites={feedSites}
        notices={notices}
        isLoggedIn={isLoggedIn}
        bookingCount={bookingCount}
        bookingPoints={bookingPoints}
        activityPoints={activityPoints}
        ongoingOrderCount={ongoingOrderCount}
    />
}
