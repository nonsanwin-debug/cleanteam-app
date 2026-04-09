'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ActionResponse = {
    success: boolean
    error?: string
    data?: any
}

/** 
 * 일반 고객 전용 인콰이어리 저장 (퍼블릭)
 * 회원가입/비회원 상관없이 누구나 요청 가능하므로 adminClient 사용 (혹은 public insert RLS 정책 활용)
 */
export async function submitCustomerInquiry(data: any): Promise<ActionResponse> {
    try {
        const adminSupabase = createAdminClient()

        const payload = {
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            clean_type: data.clean_type,
            structure_type: data.structure_type,
            address: data.address,
            detail_address: data.detail_address || '',
            area_size: data.area_size,
            work_date: data.work_date,
            time_preference: data.time_preference,
            building_condition: data.building_condition,
            notes: data.notes || '',
            image_urls: data.image_urls || [],
            status: 'pending'
        }

        const { error } = await adminSupabase
            .from('customer_inquiries')
            .insert(payload)

        if (error) {
            console.error('submitCustomerInquiry Error:', error)
            return { success: false, error: '접수 중 오류가 발생했습니다.' }
        }

        return { success: true }
    } catch (err: any) {
        console.error('submitCustomerInquiry exception:', err)
        return { success: false, error: err.message || '서버 오류' }
    }
}

/** 
 * 마스터: 고객 인콰이어리 목록 조회
 */
export async function getCustomerInquiries() {
    const supabase = await createClient()

    // 1. Check Master auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'master') return []

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
        .from('customer_inquiries')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getCustomerInquiries Error:', error)
        return []
    }

    return data || []
}

/**
 * 마스터: 상태 변경
 */
export async function updateCustomerInquiryStatus(id: string, newStatus: string): Promise<ActionResponse> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '인증 실패' }

    const adminSupabase = createAdminClient()
    
    const { error } = await adminSupabase
        .from('customer_inquiries')
        .update({ status: newStatus })
        .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/master/customer-inquiries')
    return { success: true }
}

/**
 * 마스터: 영구 삭제
 */
export async function deleteCustomerInquiry(id: string): Promise<ActionResponse> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '인증 실패' }

    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
        .from('customer_inquiries')
        .delete()
        .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/master/customer-inquiries')
    return { success: true }
}
