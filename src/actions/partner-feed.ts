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
                company_id,
                companies:company_id (name, use_alias_name),
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

        // 1-1. 별명 목록 조회 (use_alias_name 적용용)
        let aliasNames: string[] = []
        const hasAliasCompanies = sites.some(s => {
            const co = Array.isArray(s.companies) ? s.companies[0] : s.companies
            return (co as any)?.use_alias_name
        })
        
        if (hasAliasCompanies) {
            const { data: settingsData } = await adminClient
                .from('platform_settings')
                .select('feed_alias_names')
                .limit(1)
                .single()
            aliasNames = settingsData?.feed_alias_names || []
        }

        // site.id 기반으로 일관된 별명 배정 (같은 현장은 항상 같은 별명)
        function getAliasForSite(siteId: string): string | null {
            if (aliasNames.length === 0) return null
            let hash = 0
            for (let i = 0; i < siteId.length; i++) {
                hash = ((hash << 5) - hash) + siteId.charCodeAt(i)
                hash |= 0
            }
            return aliasNames[Math.abs(hash) % aliasNames.length]
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
                const useAlias = (companyObj as any)?.use_alias_name

                // 업체명 결정: feed_display_name > alias > 실제 업체명
                let displayName = (site as any).feed_display_name || null
                if (!displayName && useAlias) {
                    displayName = getAliasForSite(site.id)
                }
                if (!displayName) {
                    displayName = (companyObj as any)?.name || null
                }

                return {
                    id: site.id,
                    name: site.name,
                    address: site.address,
                    status: site.status,
                    cleaning_date: site.cleaning_date,
                    area_size: site.area_size,
                    start_time: site.start_time,
                    worker_name: site.worker_name,
                    company_name: displayName,
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

