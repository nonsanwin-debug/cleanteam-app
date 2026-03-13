'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Action Responses
export type ActionResponse = {
    success: boolean
    error?: string
}

/* ============================
    Companies Management
============================ */

export async function getMasterCompanies() {
    const supabase = await createClient()

    // 1. Fetch companies
    const { data: companies, error } = await supabase
        .from('companies')
        .select(`
            *,
            owner:users!companies_owner_id_fkey(name, email, phone)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching companies:', error)
        return []
    }

    return companies || []
}

export async function updateCompanyStatus(companyId: string, status: 'approved' | 'rejected' | 'deleted'): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('companies')
            .update({ status })
            .eq('id', companyId)

        if (error) {
            console.error('Error updating company status:', error)
            return { success: false, error: '상태 업데이트에 실패했습니다.' }
        }

        revalidatePath('/master/companies')
        return { success: true }
    } catch (error) {
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}

export async function manageCompanyPoints(companyId: string, amount: number, actionType: 'add' | 'deduct'): Promise<ActionResponse> {
    try {
        if (amount <= 0) {
            return { success: false, error: '올바른 금액을 입력하세요.' }
        }

        const supabase = await createClient()
        
        // 1. Get current company point
        const { data: company, error: fetchError } = await supabase
            .from('companies')
            .select('points, name')
            .eq('id', companyId)
            .single()
            
        if (fetchError || !company) {
            return { success: false, error: '업체 정보를 찾을 수 없습니다.' }
        }

        let newBalance = company.points || 0
        if (actionType === 'add') {
            newBalance += amount
        } else {
            newBalance -= amount
            if (newBalance < 0) {
                return { success: false, error: '업체의 잔여 포인트보다 크게 차감할 수 없습니다.' }
            }
        }

        // 2. Update company points
        const { error: updateError } = await supabase
            .from('companies')
            .update({ points: newBalance })
            .eq('id', companyId)

        if (updateError) {
            console.error('Error updating company points:', updateError)
            return { success: false, error: '포인트 처리에 실패했습니다.' }
        }

        // 3. Log (master_logs or wallet_logs) - Optional: could insert into wallet_logs as type 'system_add' to track master movements
        const { error: logError } = await supabase
            .from('wallet_logs')
            .insert({
                company_id: companyId,
                type: actionType === 'add' ? 'manual_add' : 'manual_deduct',
                amount: amount,
                balance_after: newBalance,
                description: `마스터 관리자 ${actionType === 'add' ? '포인트 충전' : '포인트 환수'}`
            })

        if (logError) {
            console.warn('Could not log master point change:', logError)
        }

        revalidatePath('/master/companies')
        return { success: true }
    } catch (error) {
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}

/* ============================
    Users Management
============================ */

export async function getMasterUsers() {
    const supabase = await createClient()

    const { data: users, error } = await supabase
        .from('users')
        .select(`
            id, name, phone, email, role, status, created_at, account_info, current_money, 
            companies(name, code, status)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching users for master:', error)
        return []
    }

    return users || []
}

import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteUserForce(userId: string): Promise<ActionResponse> {
    try {
        const adminClient = createAdminClient()

        // 1. Soft delete on `users` table
        const { error: profileError } = await adminClient
            .from('users')
            .update({ status: 'deleted' })
            .eq('id', userId)

        if (profileError) {
            console.error('Profile soft delete update error:', profileError)
            return { success: false, error: '프로필 상태 업데이트 중 오류가 발생했습니다.' }
        }

        // 2. Scramble auth state to completely block login
        const deletedEmail = `banned_${userId}_${Date.now()}@cleanteam.temp`;
        const randomPassword = crypto.randomUUID();
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            email: deletedEmail,
            password: randomPassword,
            user_metadata: { status: 'deleted', role: 'banned' }
        })

        if (authError) {
            console.error('Auth user update error:', authError)
            return { success: false, error: '인증 정보 비활성화 중 오류가 발생했습니다.' }
        }

        revalidatePath('/master/users')
        return { success: true }
    } catch (error) {
        console.error('deleteUserForce error:', error)
        return { success: false, error: '강제 탈퇴 중 오류가 발생했습니다.' }
    }
}
