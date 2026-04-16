'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'

export type FeedSite = {
    id: string
    name: string
    address: string
    status: string
    cleaning_date: string | null
    area_size: string | null
    start_time: string | null
    worker_name: string | null
    company_name: string | null
    before_photos: string[]
    after_photos: string[]
}

/**
 * 파트너 피드용 — NEXUS 전체 현장 조회
 * admin client를 사용하여 RLS 우회, 전체 현장을 최신순으로 조회
 * 완료된 현장은 before/after 사진을 포함
 */
export async function getPartnerFeedSites(): Promise<FeedSite[]> {
    noStore()
    
    try {
        const adminClient = createAdminClient()

        // 1. 전체 현장 최신 50건 조회 (업체명, 팀장명 포함)
        // 대기(scheduled) 현장 제외, completed/in_progress만 조회
        const { data: sites, error } = await adminClient
            .from('sites')
            .select(`
                id,
                name,
                address,
                status,
                cleaning_date,
                area_size,
                start_time,
                worker_name,
                companies:company_id (name),
                feed_display_name
            `)
            .eq('status', 'completed')
            .eq('hidden_from_feed', false)
            .order('cleaning_date', { ascending: false })
            .limit(200)

        if (error || !sites) {
            console.error('getPartnerFeedSites error:', error)
            return []
        }

        // 2. 모든 현장 ID 추출하여 사진 조회
        const allSiteIds = sites.map(s => s.id)

        // 3. 사진 조회 (30개씩 청크로 분할 — Supabase URL 길이 제한 우회)
        let photosMap = new Map<string, { before: string[], after: string[] }>()

        for (let i = 0; i < allSiteIds.length; i += 10) {
            const chunk = allSiteIds.slice(i, i + 10)
            const { data: photos } = await adminClient
                .from('photos')
                .select('site_id, url, type')
                .in('site_id', chunk)
                .in('type', ['before', 'after'])
                .order('created_at', { ascending: true })
                .limit(3000)

            if (photos) {
                for (const photo of photos) {
                    if (!photosMap.has(photo.site_id)) {
                        photosMap.set(photo.site_id, { before: [], after: [] })
                    }
                    const entry = photosMap.get(photo.site_id)!
                    if (photo.type === 'before' && entry.before.length < 3) {
                        entry.before.push(photo.url)
                    } else if (photo.type === 'after' && entry.after.length < 3) {
                        entry.after.push(photo.url)
                    }
                }
            }
        }

        // 4. 최종 결과 매핑 — before/after 사진이 각각 3장 이상인 현장만 반환
        return sites
            .map(site => {
                const companyObj = Array.isArray(site.companies) ? site.companies[0] : site.companies
                const sitePhotos = photosMap.get(site.id) || { before: [], after: [] }

                return {
                    id: site.id,
                    name: site.name,
                    address: site.address,
                    status: site.status,
                    cleaning_date: site.cleaning_date,
                    area_size: site.area_size,
                    start_time: site.start_time,
                    worker_name: site.worker_name,
                    company_name: (site as any).feed_display_name || (companyObj as any)?.name || null,
                    before_photos: sitePhotos.before,
                    after_photos: sitePhotos.after,
                }
            })
            .filter(site => site.before_photos.length >= 1 && site.after_photos.length >= 1)
            .sort((a, b) => {
                const dateA = a.cleaning_date || '0000-00-00'
                const dateB = b.cleaning_date || '0000-00-00'
                return dateB.localeCompare(dateA)
            })
            .slice(0, 50)
    } catch (err) {
        console.error('getPartnerFeedSites unexpected error:', err)
        return []
    }
}
