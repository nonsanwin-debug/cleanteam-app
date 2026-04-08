'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types'
import { manageCompanyPoints } from '@/actions/master'

/**
 * 파트너 리워드(적립) 요청 목록을 가져옵니다.
 * shared_orders 중 reward_type = 'points' 이고, 관련된 site 상태가 'completed'인 항목들.
 */
export async function getPartnerRewards() {
    const supabase = await createClient()

    // 1. Check Master auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '인증 실패', data: [] }

    const { data: userProfile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userProfile?.role !== 'master') return { success: false, error: '권한 없음', data: [] }

    const adminSupabase = createAdminClient()

    // 2. Fetch shared orders with reward_type = points
    // supabase rpc doesn't let us easily query inside JSONB properly without explicit raw queries in js sometimes,
    // but we can fetch them all that have transferred_site_id and filter, or use 'transferred' status.
    const { data: orders, error } = await adminSupabase
        .from('shared_orders')
        .select(`
            *,
            sender_company:company_id(id, name, code)
        `)
        .eq('status', 'transferred')
        .not('transferred_site_id', 'is', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getPartnerRewards error:', error)
        return { success: false, error: error.message, data: [] }
    }

    if (!orders || orders.length === 0) return { success: true, data: [] }

    // 3. 필터링: parsed_details 에서 reward_type이 points 인지 확인
    const pointOrders = orders.filter((o: any) => o.parsed_details && o.parsed_details.reward_type === 'points')
    
    if (pointOrders.length === 0) return { success: true, data: [] }

    // 4. 연관된 Sites 조회 (status === 'completed' 인지 확인)
    const siteIds = pointOrders.map((o: any) => o.transferred_site_id)
    
    const { data: sites } = await adminSupabase
        .from('sites')
        .select('id, status, name, cleaning_date, balance_amount')
        .in('id', siteIds)
        .eq('status', 'completed')

    if (!sites || sites.length === 0) return { success: true, data: [] }

    const completedSiteIds = new Set(sites.map(s => s.id))
    
    // 최종 결과 조립
    const results = pointOrders
        .filter((o: any) => completedSiteIds.has(o.transferred_site_id))
        .map((o: any) => {
            const site = sites.find(s => s.id === o.transferred_site_id)
            const siteName = site?.name || ''
            
            // 예상 초기 금액
            let basePrice = 0
            if (o.parsed_details && o.parsed_details.total_price) {
                basePrice = o.parsed_details.total_price
            } else if (site?.balance_amount) {
                basePrice = site.balance_amount
            }

            return {
                id: o.id,
                created_at: o.created_at,
                company: Array.isArray(o.sender_company) ? o.sender_company[0] : o.sender_company,
                site_name: siteName,
                site_date: site?.cleaning_date,
                base_price: basePrice,
                reward_paid: o.reward_paid || false
            }
        })

    return { success: true, data: results }
}

/**
 * 파트너 리워드를 지급 승인합니다.
 */
export async function approvePartnerReward(orderId: string, companyId: string, amount: number, memo: string = ''): Promise<ActionResponse> {
    const supabase = await createClient()

    // 1. Check Master auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '인증 실패' }

    const { data: userProfile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userProfile?.role !== 'master') return { success: false, error: '권한 없음' }

    const adminSupabase = createAdminClient()

    // 2. Fetch order to verify
    const { data: order } = await adminSupabase
        .from('shared_orders')
        .select('reward_paid, parsed_details, company_id')
        .eq('id', orderId)
        .single()

    if (!order) return { success: false, error: '요청 정보를 찾을 수 없습니다.' }
    if (order.company_id !== companyId) return { success: false, error: '업체 정보가 불일치합니다.' }
    if (order.reward_paid) return { success: false, error: '이미 리워드가 지급된 건입니다.' }

    // 3. 포인트 지급
    const description = memo.trim() !== '' ? `[리워드 지급] ${memo}` : `[리워드 지급] 현장 완료 공유 10% 적립`
    const pointResult = await manageCompanyPoints(companyId, amount, 'add', 'points', description)
    
    if (!pointResult.success) {
        return { success: false, error: pointResult.error || '포인트 지급에 실패했습니다.' }
    }

    // 4. 상태 업데이트
    const { error: updateError } = await adminSupabase
        .from('shared_orders')
        .update({ reward_paid: true })
        .eq('id', orderId)

    if (updateError) {
        console.error('approvePartnerReward updateError:', updateError)
        // 포인트는 지급되었으므로 크리티컬 에러
        return { success: false, error: '포인트는 지급되었으나 상태 업데이트에 실패했습니다. 관리자에게 문의하세요.' }
    }

    revalidatePath('/master/partner-rewards')
    revalidatePath('/master/partners')
    return { success: true }
}
