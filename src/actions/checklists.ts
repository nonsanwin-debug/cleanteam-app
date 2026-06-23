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

        if (!companyId) {
            console.warn('getChecklistTemplates: No company ID found')
            return []
        }

        const { data, error } = await supabase
            .from('checklist_templates')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })

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
        const companyId = await getCompanyId()

        if (!companyId) {
            console.warn('getChecklistTemplate: No company ID found')
            return null
        }

        const { data, error } = await supabase
            .from('checklist_templates')
            .select('*')
            .eq('id', id)
            .eq('company_id', companyId)
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
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            console.error('createChecklistTemplate: No authenticated user')
            return { success: false, error: '인증되지 않은 사용자입니다.' }
        }

        const { data: profile } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()

        const companyId = profile?.company_id

        console.log('📝 Creating template:', { title, companyId, userId: user.id })

        const insertData: Record<string, any> = {
            title,
            items: []
        }
        if (companyId) {
            insertData.company_id = companyId
        }

        const { data, error } = await supabase
            .from('checklist_templates')
            .insert([insertData])
            .select()

        console.log('📝 Insert result:', { data, error })

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
        const companyId = await getCompanyId()

        if (!companyId) {
            console.error('updateChecklistTemplate: No company ID found')
            return { success: false, error: '인증 권한이 없습니다.' }
        }

        // Verify ownership
        const { data: template, error: checkError } = await supabase
            .from('checklist_templates')
            .select('company_id')
            .eq('id', id)
            .single()

        if (checkError || !template || template.company_id !== companyId) {
            return { success: false, error: '수정 권한이 없는 템플릿입니다.' }
        }

        const { error } = await supabase
            .from('checklist_templates')
            .update({ items })
            .eq('id', id)
            .eq('company_id', companyId)

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
        const companyId = await getCompanyId()

        if (!companyId) {
            console.error('deleteChecklistTemplate: No company ID found')
            return { success: false, error: '인증 권한이 없습니다.' }
        }

        // Verify ownership
        const { data: template, error: checkError } = await supabase
            .from('checklist_templates')
            .select('company_id')
            .eq('id', id)
            .single()

        if (checkError || !template || template.company_id !== companyId) {
            return { success: false, error: '삭제 권한이 없는 템플릿입니다.' }
        }

        const { error } = await supabase
            .from('checklist_templates')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId)

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
