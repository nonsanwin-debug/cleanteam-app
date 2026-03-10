'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthCompany } from '@/lib/supabase/auth-context'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

export interface PublicSite {
    id: string;
    name: string;
    address: string;
    completed_at: string;
    photos_before: string[];
    photos_after: string[];
}

export interface PublicPortfolioResponse {
    success: boolean;
    companyName?: string;
    promotionContactNumber?: string;
    sites?: PublicSite[];
    error?: string;
}

/**
 * Public Server Action: Fetch portfolio data for a specific company code
 * Does not require authentication.
 */
export async function getPublicPortfolio(companyCode: string): Promise<PublicPortfolioResponse> {
    noStore();
    try {
        // Use admin client to bypass RLS for public read-only access
        const adminSupabase = createAdminClient()

        // 1. Fetch company by code
        const { data: company, error: companyError } = await adminSupabase
            .from('companies')
            .select('id, name, promotion_page_enabled, promotion_contact_number')
            .eq('code', companyCode)
            .single()

        if (companyError || !company) {
            return { success: false, error: '업체를 찾을 수 없습니다.' }
        }

        if (!company.promotion_page_enabled) {
            return { success: false, error: '해당 업체의 홍보 페이지가 비활성화되어 있습니다.' }
        }

        // 2. Fetch completed sites from the last 30 days that are not hidden
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: sites, error: sitesError } = await adminSupabase
            .from('sites')
            .select('id, name, address, completed_at')
            .eq('company_id', company.id)
            .eq('status', 'completed')
            .eq('hidden_from_promotion', false)
            .gte('completed_at', thirtyDaysAgo.toISOString())
            .order('completed_at', { ascending: false })

        if (sitesError) {
            console.error('Error fetching sites for portfolio:', sitesError)
            return { success: false, error: '데이터를 불러오는 중 오류가 발생했습니다.' }
        }

        if (!sites || sites.length === 0) {
            return { success: true, companyName: company.name, sites: [] }
        }

        // 3. Fetch photos for these sites
        const siteIds = sites.map(s => s.id)
        const { data: photos, error: photosError } = await adminSupabase
            .from('photos')
            .select('site_id, url, type, is_featured')
            .in('site_id', siteIds)
            .in('type', ['before', 'after'])

        if (photosError) {
            console.error('Error fetching photos for portfolio:', photosError)
            return { success: false, error: '사진을 불러오는 중 오류가 발생했습니다.' }
        }

        // Helper to pick up to 4 featured photos, fallback to first 4
        const getDisplayPhotos = (photoList: any[]) => {
            const featured = photoList.filter(p => p.is_featured)
            if (featured.length > 0) {
                return featured.slice(0, 4).map(p => p.url)
            }
            return photoList.slice(0, 4).map(p => p.url)
        }

        // 4. Assemble payload (limit to 4 before, 4 after)
        const publicSites: PublicSite[] = sites.map(site => {
            const sitePhotos = photos?.filter(p => p.site_id === site.id) || []

            const beforeList = sitePhotos.filter(p => p.type === 'before')
            const afterList = sitePhotos.filter(p => p.type === 'after')

            const photosBefore = getDisplayPhotos(beforeList)
            const photosAfter = getDisplayPhotos(afterList)

            return {
                id: site.id,
                name: site.name,
                address: site.address,
                completed_at: site.completed_at,
                photos_before: photosBefore,
                photos_after: photosAfter
            }
        })

        // Filter out sites that have no photos to show
        const validSites = publicSites.filter(site => site.photos_before.length > 0 || site.photos_after.length > 0)

        return {
            success: true,
            companyName: company.name,
            promotionContactNumber: company.promotion_contact_number,
            sites: validSites
        }

    } catch (error) {
        console.error('getPublicPortfolio unexpected error:', error)
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}

/**
 * Admin Server Action: Toggle visibility of a site on the public portfolio
 */
export async function toggleSitePromotionVisibility(siteId: string, isHidden: boolean) {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '인증 권한이 없습니다.' }

        const { error } = await supabase
            .from('sites')
            .update({ hidden_from_promotion: isHidden })
            .eq('id', siteId)
            .eq('company_id', companyId)

        if (error) {
            console.error('toggleSitePromotionVisibility error:', error)
            return { success: false, error: '눈가림 처리에 실패했습니다.' }
        }

        revalidatePath('/admin/promotion')
        return { success: true }
    } catch (error) {
        console.error('toggleSitePromotionVisibility unexpected error:', error)
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}

/**
 * Admin Server Action: Fetch all completed sites in the last 30 days to manage portfolio visibility
 */
export async function getAdminPortfolio() {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return []

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: sites, error } = await supabase
            .from('sites')
            .select('id, name, address, completed_at, hidden_from_promotion')
            .eq('company_id', companyId)
            .eq('status', 'completed')
            .gte('completed_at', thirtyDaysAgo.toISOString())
            .order('completed_at', { ascending: false })

        if (error) {
            console.error('getAdminPortfolio error:', error)
            return []
        }

        if (!sites || sites.length === 0) return []

        const siteIds = sites.map(s => s.id)
        const { data: photos } = await supabase
            .from('photos')
            .select('site_id, url, type')
            .in('site_id', siteIds)

        const sitesWithThumbs = sites.map(site => {
            const sitePhotos = photos?.filter(p => p.site_id === site.id) || []
            const beforePhotos = sitePhotos.filter(p => p.type === 'before')
            const afterPhotos = sitePhotos.filter(p => p.type === 'after')
            return {
                ...site,
                thumbnails: {
                    before: beforePhotos.slice(0, 2).map(p => p.url),
                    after: afterPhotos.slice(0, 2).map(p => p.url),
                    beforeCount: beforePhotos.length,
                    afterCount: afterPhotos.length
                }
            }
        })

        return sitesWithThumbs
    } catch (error) {
        console.error('getAdminPortfolio unexpected error:', error)
        return []
    }
}
