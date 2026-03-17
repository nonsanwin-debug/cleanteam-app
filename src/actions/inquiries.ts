'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { verifyMasterAccess } from './master'

// ============================================
// ADMIN (Company) Actions
// ============================================

import { getAuthCompany } from '@/lib/supabase/auth-context'

export async function createInquiry({
    type,
    content
}: {
    type: 'general' | 'banner' | 'point',
    content: string
}) {
    try {
        const { supabase, companyId } = await getAuthCompany()
        
        if (!companyId) return { success: false, error: '소속된 업체를 찾을 수 없습니다.' }

        const { error } = await supabase
            .from('admin_inquiries')
            .insert({
                company_id: companyId,
                type,
                content,
                status: 'pending'
            })

        if (error) throw error

        revalidatePath('/admin/inquiries')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to create inquiry:', error)
        return { success: false, error: '문의 등록 중 오류가 발생했습니다: ' + error.message }
    }
}

export async function getAdminInquiries() {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '소속된 업체를 찾을 수 없습니다.', data: [] }
        
        const { data, error } = await supabase
            .from('admin_inquiries')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Failed to get admin inquiries:', error)
        return { success: false, error: '문의 목록을 불러오지 못했습니다.', data: [] }
    }
}

export async function getUnreadReplyCount() {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return 0
        
        const { count, error } = await supabase
            .from('admin_inquiries')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'resolved')
            .eq('admin_read', false)

        if (error) return 0
        return count || 0
    } catch {
        return 0
    }
}

export async function markRepliesAsRead() {
    try {
        const { companyId } = await getAuthCompany()
        if (!companyId) return { success: false }

        const adminSupabase = createAdminClient()

        const { error } = await adminSupabase
            .from('admin_inquiries')
            .update({ admin_read: true })
            .eq('company_id', companyId)
            .eq('status', 'resolved')
            .eq('admin_read', false)

        if (error) throw error

        revalidatePath('/admin/inquiries')
        // We might also need to revalidate the layout if the badge is in the layout
        revalidatePath('/admin', 'layout')
        return { success: true }
    } catch (error) {
        console.error('Failed to mark replies as read:', error)
        return { success: false }
    }
}

// ============================================
// MASTER Actions
// ============================================

export async function getAllInquiries() {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.', data: [] }

        const adminClient = createAdminClient()
        
        // Fetch all inquiries and join with companies table to get the company name
        const { data, error } = await adminClient
            .from('admin_inquiries')
            .select(`
                *,
                company:companies(name, code, points)
            `)
            .order('status', { ascending: false }) // 'pending' comes before 'resolved' textually
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Failed to get all inquiries for master:', error)
        return { success: false, error: '전체 문의 목록을 불러오지 못했습니다.', data: [] }
    }
}

export async function createMasterNotice(companyId: string, content: string) {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()
        
        const { error } = await adminClient
            .from('admin_inquiries')
            .insert({
                company_id: companyId,
                type: 'notice',
                content: content,
                status: 'resolved', // treat notices implicitly as resolved because they are just messages
                admin_read: false,
                reply: '', // or leave null
                resolved_at: new Date().toISOString()
            })

        if (error) throw error

        revalidatePath('/master/companies')
        revalidatePath('/master/inquiries')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to create master notice:', error)
        return { success: false, error: '메시지 발송 중 오류가 발생했습니다.' }
    }
}

export async function resolveInquiry(id: string, reply: string) {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()
        
        const { error } = await adminClient
            .from('admin_inquiries')
            .update({ 
                status: 'resolved',
                reply: reply,
                resolved_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/master/inquiries')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to resolve inquiry:', error)
        return { success: false, error: '문의 상태 업데이트에 실패했습니다.' }
    }
}

export async function getPendingInquiryCount() {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return 0

        const adminClient = createAdminClient()
        
        const { count, error } = await adminClient
            .from('admin_inquiries')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')

        if (error) return 0
        return count || 0
    } catch {
        return 0
    }
}
