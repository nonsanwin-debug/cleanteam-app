'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Site = {
    id: string
    name: string
    address: string
    status: 'scheduled' | 'in_progress' | 'completed'
    worker_id: string | null
    created_at: string
    // New Fields
    customer_name?: string
    customer_phone?: string
    residential_type?: string
    area_size?: string
    structure_type?: string
    cleaning_date?: string
    start_time?: string
    special_notes?: string // 특이사항
    worker?: {
        name: string | null
    } | null
}

export type CreateSiteDTO = {
    name: string
    address: string
    worker_id?: string
    status?: 'scheduled' | 'in_progress' | 'completed'
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

export async function getSites() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('sites')
        .select(`
      *,
      worker:users!worker_id (name)
    `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching sites:', error)
        return []
    }

    return data as Site[]
}

export async function getWorkers() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'worker')
        .order('name')

    if (error) {
        console.error('Error fetching workers:', error)
        return []
    }

    return data
}

export async function createSite(formData: CreateSiteDTO) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('sites')
        .insert([
            {
                name: formData.name,
                address: formData.address,
                worker_id: formData.worker_id || null,
                status: formData.status || 'scheduled',
                // New Fields
                customer_name: formData.customer_name,
                customer_phone: formData.customer_phone,
                residential_type: formData.residential_type,
                area_size: formData.area_size,
                structure_type: formData.structure_type,
                cleaning_date: formData.cleaning_date,
                start_time: formData.start_time,
                special_notes: formData.special_notes
            }
        ])

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/sites')
    return { success: true }
}

export async function deleteSite(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/sites')
    return { success: true }
}

export async function getSiteById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('sites')
        .select(`
      *,
      worker:users!worker_id (name)
    `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching site:', error)
        return null
    }

    return data as Site
}

export async function updateSite(id: string, formData: CreateSiteDTO) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('sites')
        .update({
            name: formData.name,
            address: formData.address,
            worker_id: formData.worker_id || null,
            status: formData.status || 'scheduled',
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            residential_type: formData.residential_type,
            area_size: formData.area_size,
            structure_type: formData.structure_type,
            cleaning_date: formData.cleaning_date,
            start_time: formData.start_time,
            special_notes: formData.special_notes
        })
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/sites')
    return { success: true }
}

