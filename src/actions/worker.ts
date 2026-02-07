'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export type AssignedSite = {
    id: string
    name: string
    address: string
    status: 'scheduled' | 'in_progress' | 'completed'
    created_at: string
    // New Fields
    customer_name?: string
    customer_phone?: string
    residential_type?: string
    area_size?: string
    structure_type?: string
    cleaning_date?: string
    start_time?: string
    special_notes?: string
}

export async function getAssignedSites() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('sites')
        .select('*')
        .or(`worker_id.eq.${user.id},worker_id.is.null`) // For demo purposed allow unassigned view or explicit
        .eq('worker_id', user.id) // Strict: only assigned
        .neq('status', 'completed')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching assigned sites:', error)
        return []
    }

    return data as AssignedSite[]
}

export async function startWork(siteId: string, location: string) {
    const supabase = await createClient()

    // 1. Update site status
    const { error } = await supabase
        .from('sites')
        .update({ status: 'in_progress' })
        .eq('id', siteId)

    if (error) throw new Error(error.message)

    // 2. Log start time/location (Optional: could be in 'checklist_submissions' or separate log)
    // For MVP, we assume 'in_progress' status is enough.

    revalidatePath('/worker/home')
    return { success: true }
}

export async function uploadPhoto(formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File
    const siteId = formData.get('siteId') as string
    const type = formData.get('type') as 'before' | 'during' | 'after'

    if (!file || !siteId || !type) {
        throw new Error('Missing required fields')
    }

    const fileName = `${siteId}/${type}/${uuidv4()}-${file.name}`

    // 1. Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('site-photos')
        .upload(fileName, file)

    if (uploadError) throw new Error(uploadError.message)

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase
        .storage
        .from('site-photos')
        .getPublicUrl(fileName)

    // 3. Insert into Photos table
    const { error: dbError } = await supabase
        .from('photos')
        .insert([
            {
                site_id: siteId,
                url: publicUrl,
                type: type
            }
        ])

    if (dbError) throw new Error(dbError.message)

    revalidatePath(`/worker/sites/${siteId}`)
    return { success: true, publicUrl }
}

export async function getSiteDetails(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return null;
    return data as AssignedSite;
}

export async function getSitePhotos(id: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('photos')
        .select('*')
        .eq('site_id', id)
        .order('created_at', { ascending: true })

    return data || []
}
