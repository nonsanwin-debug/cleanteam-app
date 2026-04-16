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
                companies:company_id (name)
            `)
            .in('status', ['completed', 'in_progress'])
            .order('cleaning_date', { ascending: false, nullsFirst: false })
            .limit(100)

        if (error || !sites) {
            console.error('getPartnerFeedSites error:', error)
            return []
        }

        // 2. 모든 현장 ID 추출하여 사진 조회
        const allSiteIds = sites.map(s => s.id)

        // 3. 완료된 현장의 before/after 사진 조회
        let photosMap = new Map<string, { before: string[], after: string[] }>()

        if (allSiteIds.length > 0) {
            const { data: photos } = await adminClient
                .from('photos')
                .select('site_id, url, type')
                .in('site_id', allSiteIds)
                .in('type', ['before', 'after'])
                .order('created_at', { ascending: true })

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
                    company_name: (companyObj as any)?.name || null,
                    before_photos: sitePhotos.before,
                    after_photos: sitePhotos.after,
                }
            })
            .filter(site => site.before_photos.length >= 3 && site.after_photos.length >= 3)
    } catch (err) {
        console.error('getPartnerFeedSites unexpected error:', err)
        return []
    }
}
