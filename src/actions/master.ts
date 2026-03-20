'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Action Responses
export type ActionResponse = {
    success: boolean
    error?: string
}

export async function verifyMasterAccess() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
        
    return profile?.role === 'master'
}

/* ============================
    Companies Management
============================ */

export async function getMasterCompanies() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    // 1. Fetch companies, excluding deleted ones
    const { data: companies, error } = await adminClient
        .from('companies')
        .select('*')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching companies:', error)
        return []
    }

    return companies || []
}

export async function updateCompanyStatus(companyId: string, status: 'approved' | 'rejected' | 'deleted'): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .update({ status })
            .eq('id', companyId)

        if (error) {
            console.error('Error updating company status:', error)
            return { success: false, error: '상태 업데이트에 실패했습니다.' }
        }

        // When a company is approved, automatically activate its pending admin/users
        if (status === 'approved') {
            await adminClient
                .from('users')
                .update({ status: 'active' })
                .eq('company_id', companyId)
                .eq('status', 'pending');
        } else if (status === 'rejected') {
            // If rejected, maybe set them to deleted so they don't clog up the pending list forever
            // or leave them pending so they can be re-approved. Setting to deleted is safer for cleanup.
            await adminClient
                .from('users')
                .update({ status: 'deleted' })
                .eq('company_id', companyId)
                .eq('status', 'pending');
        }

        revalidatePath('/master/companies')
        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
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

        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()
        
        // 1. Get current company point
        const { data: company, error: fetchError } = await adminClient
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
        const { error: updateError } = await adminClient
            .from('companies')
            .update({ points: newBalance })
            .eq('id', companyId)

        if (updateError) {
            console.error('Error updating company points:', updateError)
            return { success: false, error: '포인트 처리에 실패했습니다.' }
        }

        // 3. Log (master_logs or wallet_logs) - Optional: could insert into wallet_logs as type 'system_add' to track master movements
        const { error: logError } = await adminClient
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
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    const { data: users, error } = await adminClient
        .from('users')
        .select(`
            id, name, phone, email, role, status, created_at, account_info, current_money, 
            companies(name, code, status)
        `)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching users for master:', error)
        return []
    }

    return users || []
}

export async function getMasterPartners() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    const { data: partners, error } = await adminClient
        .from('users')
        .select(`
            id, name, phone, email, role, status, created_at, account_info, current_money, 
            companies(name, code, status)
        `)
        .eq('role', 'partner')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching partners for master:', error)
        return []
    }

    return partners || []
}

export async function deleteUserForce(userId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

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
        // NOT scrambling password so they can log back in easily upon restore IF we just change their metadata.
        // Or we just update their auth role to 'banned'.
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { status: 'deleted', role: 'banned' }
        })

        if (authError) {
            console.error('Auth user update error:', authError)
            return { success: false, error: '인증 정보 비활성화 중 오류가 발생했습니다.' }
        }

        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('deleteUserForce error:', error)
        return { success: false, error: '강제 탈퇴 중 오류가 발생했습니다.' }
    }
}


/* ============================
    Recovery Management
============================ */

export async function getDeletedCompanies() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    const { data: companies, error } = await adminClient
        .from('companies')
        .select('*')
        .eq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching deleted companies:', error)
        return []
    }

    return companies || []
}

export async function getDeletedUsers() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    const { data: users, error } = await adminClient
        .from('users')
        .select(`
            id, name, phone, email, role, status, created_at, account_info, current_money, 
            companies(name, code, status)
        `)
        .eq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching deleted users:', error)
        return []
    }

    return users || []
}

export async function restoreCompany(companyId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .update({ status: 'approved' }) // Restore back to approved (or active depending on your logic)
            .eq('id', companyId)

        if (error) {
            console.error('Error restoring company error:', error)
            return { success: false, error: '업체 복구 중 오류가 발생했습니다.' }
        }

        // Also restore associated deleted users
        await adminClient
            .from('users')
            .update({ status: 'active' })
            .eq('company_id', companyId)
            .eq('status', 'deleted');

        revalidatePath('/master/companies')
        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('restoreCompany error:', error)
        return { success: false, error: '복구 중 오류가 발생했습니다.' }
    }
}

export async function restoreUser(userId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 1. Restore `users` table state
        const { data: userProfile, error: profileError } = await adminClient
            .from('users')
            .update({ status: 'active' }) // Back to active
            .eq('id', userId)
            .select('role')
            .single()

        if (profileError) {
            console.error('User restore profile update error:', profileError)
            return { success: false, error: '회원 프로필 복구 중 오류가 발생했습니다.' }
        }

        // 2. Restore auth user metadata
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { status: 'active', role: userProfile?.role || 'worker' }
        })

        if (authError) {
            console.error('Auth user restore error:', authError)
            return { success: false, error: '회원 인증 정보 복구 중 오류가 발생했습니다.' }
        }

        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('restoreUser error:', error)
        return { success: false, error: '복구 중 오류가 발생했습니다.' }
    }
}

export async function hardDeleteCompany(companyId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .delete()
            .eq('id', companyId)

        if (error) {
            console.error('Error hard deleting company:', error)
            if (error.code === '23503') {
                return { success: false, error: '이 업체에 연결된 작업 혹은 결제 내역이 있어 완전히 삭제할 수 없습니다.' }
            }
            return { success: false, error: '업체 영구 삭제 중 오류가 발생했습니다.' }
        }

        revalidatePath('/master/companies')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('hardDeleteCompany error:', error)
        return { success: false, error: '영구 삭제 중 오류가 발생했습니다.' }
    }
}

export async function hardDeleteUser(userId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 1. Delete from auth.users (This cascads to public.users usually)
        const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
        
        if (authError) {
            console.error('Auth user hard delete error:', authError)
            return { success: false, error: '인증 정보 영구 삭제 중 오류가 발생했습니다.' }
        }

        // 2. Just to be safe, delete from public.users as well in case cascade is off
        const { error: profileError } = await adminClient
            .from('users')
            .delete()
            .eq('id', userId)

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('User profile hard delete error:', profileError)
            if (profileError.code === '23503') {
                return { success: false, error: '이 회원과 연결된 작업 내역이 있어 프로필을 완전히 지울 수 없습니다.' }
            }
        }

        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('hardDeleteUser error:', error)
        return { success: false, error: '영구 삭제 중 오류가 발생했습니다.' }
    }
}
