'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthCompany } from '@/lib/supabase/auth-context'
import { revalidatePath } from 'next/cache'

export type AdminMemo = {
    id: string
    company_id: string
    memo_date: string
    content: string
    created_by: string
    created_at: string
    updated_at: string
}

export type ActionResponse<T = any> = {
    success: boolean
    error?: string
    data?: T
}

/**
 * 특정 월의 모든 메모 조회 (달력 표시용)
 * @param startDate 조회 시작일 (YYYY-MM-DD 형식, 통상 달력 첫째 날)
 * @param endDate 조회 종료일 (YYYY-MM-DD 형식, 통상 달력 마지막 날)
 */
export async function getAdminMemosByDateRange(startDate: string, endDate: string): Promise<ActionResponse<AdminMemo[]>> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '소속 업체를 찾을 수 없습니다.' }

        const { data, error } = await supabase
            .from('admin_memos')
            .select('*')
            .eq('company_id', companyId)
            .gte('memo_date', startDate)
            .lte('memo_date', endDate)
            .order('memo_date', { ascending: true })

        if (error) {
            console.error('Error fetching admin memos:', error)
            return { success: false, error: '메모를 불러오는 데 실패했습니다.' }
        }

        return { success: true, data: data as AdminMemo[] }
    } catch (error) {
        console.error('Unexpected error fetching admin memos:', error)
        return { success: false, error: '알 수 없는 오류가 발생했습니다.' }
    }
}

/**
 * 특정 날짜의 메모 조회
 */
export async function getAdminMemoByDate(date: string): Promise<ActionResponse<AdminMemo | null>> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '소속 업체를 찾을 수 없습니다.' }

        const { data, error } = await supabase
            .from('admin_memos')
            .select('*')
            .eq('company_id', companyId)
            .eq('memo_date', date)
            .maybeSingle()

        if (error) {
            console.error('Error fetching admin memo:', error)
            return { success: false, error: '메모를 불러오는 데 실패했습니다.' }
        }

        return { success: true, data: (data as AdminMemo) || null }
    } catch (error) {
        console.error('Unexpected error fetching admin memo:', error)
        return { success: false, error: '알 수 없는 오류가 발생했습니다.' }
    }
}

/**
 * 특정 날짜에 메모 저장 (있으면 업데이트, 없으면 생성)
 */
export async function saveAdminMemo(date: string, content: string): Promise<ActionResponse> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '소속 업체를 찾을 수 없습니다.' }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: '인증되지 않은 사용자입니다.' }

        // 내용이 비어있으면 삭제 처리
        if (!content || content.trim() === '') {
            return deleteAdminMemo(date)
        }

        const { error } = await supabase
            .from('admin_memos')
            .upsert(
                {
                    company_id: companyId,
                    memo_date: date,
                    content: content.trim(),
                    created_by: user.id,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'company_id,memo_date' }
            )

        if (error) {
            console.error('Error saving admin memo:', error)
            return { success: false, error: '메모 저장에 실패했습니다: ' + error.message }
        }

        revalidatePath('/admin/memos')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error saving admin memo:', error)
        return { success: false, error: '메모 저장 중 오류가 발생했습니다.' }
    }
}

/**
 * 특정 날짜의 메모 삭제
 */
export async function deleteAdminMemo(date: string): Promise<ActionResponse> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '소속 업체를 찾을 수 없습니다.' }

        const { error } = await supabase
            .from('admin_memos')
            .delete()
            .eq('company_id', companyId)
            .eq('memo_date', date)

        if (error) {
            console.error('Error deleting admin memo:', error)
            return { success: false, error: '메모 삭제에 실패했습니다: ' + error.message }
        }

        revalidatePath('/admin/memos')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error deleting admin memo:', error)
        return { success: false, error: '메모 삭제 중 오류가 발생했습니다.' }
    }
}
