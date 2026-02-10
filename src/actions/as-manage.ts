'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse, ASRequest } from '@/types'

export async function getASRequests() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('as_requests')
        .select(`
            *,
            site:sites!site_id (name),
            worker:users!worker_id (name)
        `)
        .order('occurred_at', { ascending: false })

    if (error) {
        console.error('Error fetching AS requests:', error)
        return []
    }

    return data as ASRequest[]
}

export async function createASRequest(formData: {
    site_id?: string | null
    site_name: string
    worker_id?: string | null
    description: string
    processing_details?: string
    occurred_at: string
    status: 'pending' | 'resolved' | 'monitoring'
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('as_requests')
        .insert({
            site_id: formData.site_id || null,
            site_name: formData.site_name,
            worker_id: formData.worker_id || null,
            description: formData.description,
            processing_details: formData.processing_details || null,
            occurred_at: formData.occurred_at,
            status: formData.status
        })

    if (error) {
        console.error('Error creating AS request:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/as-manage')
    return { success: true }
}

export async function updateASRequest(id: string, formData: {
    description: string
    processing_details?: string
    status: 'pending' | 'resolved' | 'monitoring'
    resolved_at?: string
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('as_requests')
        .update({
            description: formData.description,
            processing_details: formData.processing_details || null,
            status: formData.status,
            resolved_at: formData.resolved_at || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating AS request:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/as-manage')
    return { success: true }
}

export async function getASStats() {
    const supabase = await createClient()

    // Needs to get: Worker Name | Total Completed Sites | AS Count | AS Rate
    // 1. Get all workers
    const { data: workers } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'worker')

    if (!workers) return []

    // 2. Get completed sites count per worker
    // Using a raw query or grouping might be better, but loop is simpler for now or RPC
    // Let's fetch all completed sites and aggregate in memory (assuming not huge scale yet)
    const { data: sites } = await supabase
        .from('sites')
        .select('worker_id')
        .eq('status', 'completed')

    // 3. Get all AS requests
    const { data: asRequests } = await supabase
        .from('as_requests')
        .select('worker_id')

    const stats = workers.map(worker => {
        const completedCount = sites?.filter(s => s.worker_id === worker.id).length || 0
        const asCount = asRequests?.filter(a => a.worker_id === worker.id).length || 0
        const rate = completedCount > 0 ? ((asCount / completedCount) * 100).toFixed(1) : '0'

        return {
            id: worker.id,
            name: worker.name,
            completedCount,
            asCount,
            rate
        }
    })

    // Sort by AS Count desc
    return stats.sort((a, b) => b.asCount - a.asCount)
}

export async function deleteASRequest(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('as_requests')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/as-manage')
    return { success: true }
}
