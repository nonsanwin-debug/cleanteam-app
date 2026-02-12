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

async function getCompanyId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

    return profile?.company_id || null
}

export async function getChecklistTemplates() {
    try {
        const supabase = await createClient()
        const companyId = await getCompanyId()

        let query = supabase
            .from('checklist_templates')
            .select('*')
            .order('created_at', { ascending: false })

        if (companyId) {
            query = query.eq('company_id', companyId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching templates:', error)
            return []
        }

        return data as ChecklistTemplate[]
    } catch (error) {
        console.error('Unexpected error in getChecklistTemplates:', error)
        return []
    }
}

export async function getChecklistTemplate(id: string) {
    try {
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
    } catch (error) {
        console.error('Unexpected error in getChecklistTemplate:', error)
        return null
    }
}

export async function createChecklistTemplate(title: string) {
    try {
        const supabase = await createClient()
        const companyId = await getCompanyId()

        const insertData: any = {
            title,
            items: []
        }
        if (companyId) {
            insertData.company_id = companyId
        }

        const { error } = await supabase
            .from('checklist_templates')
            .insert([insertData])

        if (error) {
            console.error('Error creating template:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/admin/checklists')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in createChecklistTemplate:', error)
        return { success: false, error: '템플릿 생성 중 오류가 발생했습니다.' }
    }
}

export async function updateChecklistTemplate(id: string, items: CheckItem[]) {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('checklist_templates')
            .update({ items })
            .eq('id', id)

        if (error) {
            console.error('Error updating template:', error)
            return { success: false, error: error.message }
        }

        revalidatePath(`/admin/checklists/${id}`)
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in updateChecklistTemplate:', error)
        return { success: false, error: '템플릿 수정 중 오류가 발생했습니다.' }
    }
}

export async function deleteChecklistTemplate(id: string) {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('checklist_templates')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting template:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/admin/checklists')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in deleteChecklistTemplate:', error)
        return { success: false, error: '템플릿 삭제 중 오류가 발생했습니다.' }
    }
}
