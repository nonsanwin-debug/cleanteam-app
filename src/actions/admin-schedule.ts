'use server'

import { getAuthCompany } from '@/lib/supabase/auth-context'
import { unstable_noStore as noStore } from 'next/cache'

export async function getAdminDailySiteCounts(startDateStr: string, endDateStr: string) {
    noStore()
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return {}

    const { data: sites, error } = await supabase
        .from('sites')
        .select('cleaning_date')
        .eq('company_id', companyId)
        .gte('cleaning_date', startDateStr)
        .lte('cleaning_date', endDateStr)

    if (error) {
        console.error('getAdminDailySiteCounts error', error)
        return {}
    }

    const counts: Record<string, number> = {}
    for (const s of sites || []) {
        if (!s.cleaning_date) continue
        counts[s.cleaning_date] = (counts[s.cleaning_date] || 0) + 1
    }
    return counts
}

export async function getAdminSitesByDate(dateStr: string) {
    noStore()
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data, error } = await supabase
        .from('sites')
        .select(`
            *,
            worker:users!worker_id (name, display_color)
        `)
        .eq('company_id', companyId)
        .eq('cleaning_date', dateStr)
        .order('start_time', { ascending: true })

    if (error) {
        console.error('getAdminSitesByDate error', error)
        return []
    }
    return data || []
}
