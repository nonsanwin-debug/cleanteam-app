'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * 마스터용 — 파트너 피드에서 현장 숨기기/보이기 토글
 */
export async function toggleFeedVisibility(siteId: string, hidden: boolean) {
    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('sites')
            .update({ hidden_from_feed: hidden })
            .eq('id', siteId)

        if (error) {
            console.error('toggleFeedVisibility error:', error)
            return { success: false, error: '업데이트 실패' }
        }

        revalidatePath('/master/settings')
        return { success: true }
    } catch (err) {
        console.error('toggleFeedVisibility unexpected:', err)
        return { success: false, error: '서버 오류' }
    }
}

/**
 * 마스터용 — 피드에 표시 가능한 전체 현장 목록 조회
 */
export async function getFeedSitesList() {
    try {
        const adminClient = createAdminClient()
        const { data: sites, error } = await adminClient
            .from('sites')
            .select('id, name, address, cleaning_date, status, hidden_from_feed, feed_display_name, companies:company_id(name)')
            .eq('status', 'completed')
            .order('cleaning_date', { ascending: false })
            .limit(100)

        if (error || !sites) return []

        return sites.map(s => {
            const companyObj = Array.isArray(s.companies) ? s.companies[0] : s.companies
            return {
                id: s.id,
                name: s.name,
                address: s.address,
                cleaning_date: s.cleaning_date,
                hidden_from_feed: s.hidden_from_feed ?? true,
                company_name: (companyObj as any)?.name || '미지정',
                feed_display_name: (s as any).feed_display_name || null,
            }
        })
    } catch (err) {
        console.error('getFeedSitesList error:', err)
        return []
    }
}

/**
 * 마스터용 — 피드 현장의 표시 업체명 변경
 */
export async function updateFeedDisplayName(siteId: string, displayName: string) {
    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('sites')
            .update({ feed_display_name: displayName || null })
            .eq('id', siteId)

        if (error) {
            console.error('updateFeedDisplayName error:', error)
            return { success: false, error: '업데이트 실패' }
        }

        revalidatePath('/master/settings')
        return { success: true }
    } catch (err) {
        console.error('updateFeedDisplayName unexpected:', err)
        return { success: false, error: '서버 오류' }
    }
}
