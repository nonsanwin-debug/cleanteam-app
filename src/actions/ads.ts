'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyMasterAccess } from './master' // Helper to check if user is master

export async function getAds() {
    try {
        const supabase = await createClient()
        
        // Use verifyMasterAccess to ensure only master can see all ads including inactive
        const isMaster = await verifyMasterAccess()
        
        if (!isMaster) {
            return { success: false, error: '권한이 없습니다.', data: null }
        }

        const { data, error } = await supabase
            .from('ads')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Failed to get ads:', error)
        return { success: false, error: error.message, data: null }
    }
}

export async function createAd(adData: {
    title: string,
    image_url: string,
    link_url?: string,
    phone_number?: string,
    placement: string,
    is_active: boolean,
    max_impressions: number
}) {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const supabase = await createClient()
        
        const { error } = await supabase
            .from('ads')
            .insert({
                title: adData.title,
                image_url: adData.image_url,
                link_url: adData.link_url || null,
                phone_number: adData.phone_number || null,
                placement: adData.placement,
                is_active: adData.is_active,
                max_impressions: adData.max_impressions,
                impressions_count: 0,
                clicks_count: 0
            })

        if (error) throw error

        revalidatePath('/master/ads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to create ad:', error)
        return { success: false, error: error.message }
    }
}

export async function updateAdStatus(id: string, is_active: boolean) {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const supabase = await createClient()
        
        const { error } = await supabase
            .from('ads')
            .update({ is_active })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/master/ads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to update ad status:', error)
        return { success: false, error: error.message }
    }
}

export async function updateAd(id: string, adData: {
    title?: string,
    image_url?: string,
    link_url?: string,
    phone_number?: string,
    placement?: string,
    is_active?: boolean,
    max_impressions?: number
}) {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const supabase = await createClient()
        
        // Prepare the update payload by removing undefined values
        const payload: any = {}
        if (adData.title !== undefined) payload.title = adData.title
        if (adData.image_url !== undefined) payload.image_url = adData.image_url
        if (adData.link_url !== undefined) payload.link_url = adData.link_url || null
        if (adData.phone_number !== undefined) payload.phone_number = adData.phone_number || null
        if (adData.placement !== undefined) payload.placement = adData.placement
        if (adData.is_active !== undefined) payload.is_active = adData.is_active
        if (adData.max_impressions !== undefined) payload.max_impressions = adData.max_impressions

        const { error } = await supabase
            .from('ads')
            .update(payload)
            .eq('id', id)

        if (error) throw error

        revalidatePath('/master/ads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to update ad:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteAd(id: string) {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const supabase = await createClient()
        
        const { error } = await supabase
            .from('ads')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/master/ads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to delete ad:', error)
        return { success: false, error: error.message }
    }
}

// Client-facing actions (No master verification required, uses RLS)

export async function getActiveAds(placement: string) {
    try {
        const supabase = await createClient()
        
        // RLS will automatically filter out inactive ads and max_impressions reached
        const { data, error } = await supabase
            .from('ads')
            .select('*')
            .eq('placement', placement)
            
        if (error) throw error
        
        return { success: true, data }
    } catch (error: any) {
        console.error('Failed to get active ads:', error)
        return { success: false, error: error.message, data: [] }
    }
}
