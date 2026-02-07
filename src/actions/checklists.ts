'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type CheckItem = {
    id: string
    text: string
    required: boolean
    description?: string
}

export type ChecklistTemplate = {
    id: string
    title: string
    items: CheckItem[]
    created_at: string
}

export async function getChecklistTemplates() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching templates:', error)
        return []
    }

    return data as ChecklistTemplate[]
}

export async function getChecklistTemplate(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching template:', error)
        return null
    }

    return data as ChecklistTemplate
}

export async function createChecklistTemplate(title: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('checklist_templates')
        .insert([
            {
                title,
                items: [] // Start empty
            }
        ])

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/checklists')
    return { success: true }
}

export async function updateChecklistTemplate(id: string, items: CheckItem[]) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('checklist_templates')
        .update({ items })
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath(`/admin/checklists/${id}`)
    return { success: true }
}

export async function deleteChecklistTemplate(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/checklists')
    return { success: true }
}
