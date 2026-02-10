'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types'

export async function getUsersWithClaims() {
    const supabase = await createClient()

    // Fetch users with role 'worker'
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .order('name')

    if (error) {
        console.error('Error fetching users:', error)
        return []
    }

    // Fetch pending claims for each user
    // We could do this with a join, but for simplicity and type safety let's do it here or use a better query
    // Let's try to get sites with payment_status = 'requested' grouped by worker_id
    const { data: claims } = await supabase
        .from('sites')
        .select('id, name, worker_id, claimed_amount, payment_status, created_at')
        .eq('payment_status', 'requested')

    // Attach claims to users
    const usersWithClaims = users.map(user => {
        const userClaims = claims?.filter(c => c.worker_id === user.id) || []
        const totalClaimAmount = userClaims.reduce((sum, c) => sum + (c.claimed_amount || 0), 0)
        return {
            ...user,
            claims: userClaims,
            totalPending: totalClaimAmount
        }
    })

    return usersWithClaims
}

export async function getWithdrawalRequests() {
    const supabase = await createClient()

    // Join with users to get names (if foreign key exists and RLS allows)
    // Supabase - we can just fetch requests and then map users manually or use select

    const { data: requests, error } = await supabase
        .from('withdrawal_requests')
        .select(`
            *,
            users (
                name,
                phone
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching withdrawal requests:', error)
        return []
    }

    return requests
}

export async function getPendingWithdrawalCount() {
    const supabase = await createClient()

    const { count, error } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    if (error) {
        console.error('Error fetching pending withdrawal count:', error)
        return 0
    }

    return count || 0
}

export async function approvePayment(siteId: string, userId: string, amount: number): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        // Use a unique RPC name to avoid any overloading/conflict issues
        const { data, error } = await supabase.rpc('approve_site_payment_final_v1', {
            p_site_id: siteId,
            p_user_id: userId,
            p_amount: amount
        })

        if (error) {
            console.error('RPC Error:', error)
            return { success: false, error: `DB 연동 오류: ${error.message}` }
        }

        if (!data || !data.success) {
            console.error('Payment approval failed:', data)
            return { success: false, error: data?.error || '지급 처리에 실패했습니다.' }
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Payment approval unexpected error:', error)
        return { success: false, error: `시스템 오류: ${error.message || '알 수 없는 오류'}` }
    }
}

export async function processWithdrawal(requestId: string, action: 'paid' | 'rejected', rejectionReason?: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        // Use RPC function for atomic updates and RLS bypass
        const { data, error } = await supabase.rpc('process_withdrawal_admin', {
            p_request_id: requestId,
            p_status: action,
            p_reason: rejectionReason
        })

        if (error) {
            console.error('RPC Error:', error)
            throw new Error(error.message)
        }

        if (!data || !data.success) {
            console.error('Process withdrawal failed:', data)
            return { success: false, error: data?.error || '처리 실패' }
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Process Withdrawal Error:', error)
        return { success: false, error: '출금 처리 중 오류가 발생했습니다.' }
    }
}

// ============================================
// Worker Management Functions
// ============================================

export async function getAllWorkers() {
    const supabase = await createClient()

    const { data: workers, error } = await supabase
        .from('users')
        .select('id, name, phone, email, worker_type, current_money, account_info, created_at')
        .eq('role', 'worker')
        .order('name')

    if (error) {
        console.error('Error fetching workers:', error)
        return []
    }

    return workers
}

import { createAdminClient } from '@/lib/supabase/admin'

export async function createWorker(data: {
    loginId: string
    name: string
    phone: string
    password: string
    workerType: 'leader' | 'member'
    email?: string
    accountInfo?: string
}): Promise<ActionResponse> {
    try {
        const standardSupabase = await createClient()
        const adminClient = createAdminClient()

        // 1. Get current admin's company info
        const { data: { user: adminUser } } = await standardSupabase.auth.getUser()
        let companyId = null
        let companyName = null

        if (adminUser) {
            const { data: adminProfile } = await standardSupabase
                .from('users')
                .select('company_id, companies(name)')
                .eq('id', adminUser.id)
                .single()

            if (adminProfile) {
                companyId = adminProfile.company_id
                companyName = (adminProfile.companies as any)?.name
            }
        }

        console.log('Admin creating worker:', { adminId: adminUser?.id, companyId, companyName })

        // 2. Create auth user
        let userId = ''
        const normalizedLoginId = data.loginId.toLowerCase()
        const email = `${normalizedLoginId}@cleanteam.temp`

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: email,
            password: data.password,
            email_confirm: true,
            user_metadata: {
                name: data.name,
                phone: data.phone,
                role: 'worker',
                company_name: companyName // Trigger uses this to find company_id
            }
        })

        if (authError) {
            if (authError.message.includes('already registered') || authError.status === 422) {
                const { data: users } = await adminClient.auth.admin.listUsers()
                const existingUser = users.users.find(u => u.email === email)
                if (existingUser) {
                    userId = existingUser.id
                    // IMPORTANT: Update password if user already exists to ensure it matches admin's entry
                    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
                        password: data.password,
                        user_metadata: {
                            name: data.name,
                            phone: data.phone,
                            role: 'worker',
                            company_name: companyName
                        }
                    })
                    if (updateError) throw new Error(`기존 계정 정보 업데이트 실패: ${updateError.message}`)
                } else {
                    throw new Error(authError.message)
                }
            } else {
                throw new Error(authError.message)
            }
        } else {
            userId = authData.user.id
        }

        // 3. Update/Upsert user profile in public.users table
        const { error: userError } = await adminClient
            .from('users')
            .upsert({
                id: userId,
                name: data.name,
                phone: data.phone,
                email: email,
                role: 'worker',
                worker_type: data.workerType,
                account_info: data.accountInfo,
                company_id: companyId,
                status: 'active',
                updated_at: new Date().toISOString()
            })

        if (userError) {
            console.error('User creation error:', userError)
            throw new Error(userError.message)
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Create worker error:', error)
        // Return specific error message
        return { success: false, error: error.message || '팀원 생성 중 오류가 발생했습니다.' }
    }
}

export async function updateWorkerRole(
    userId: string,
    newRole: 'leader' | 'member'
): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('users')
            .update({ worker_type: newRole })
            .eq('id', userId)
            .eq('role', 'worker') // Safety check: only update workers

        if (error) {
            console.error('Update role error:', error)
            throw new Error(error.message)
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Update worker role error:', error)
        return { success: false, error: '역할 변경 중 오류가 발생했습니다.' }
    }
}
