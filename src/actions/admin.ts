'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types'

export async function getUsersWithClaims() {
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return []

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return []

    // Fetch users with role 'worker' and same company_id
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .eq('company_id', profile.company_id)
        .order('name')

    if (error) {
        console.error('Error fetching users:', error)
        return []
    }

    // Fetch pending claims for each user in the same company
    const { data: claims } = await supabase
        .from('sites')
        .select('id, name, worker_id, claimed_amount, payment_status, created_at')
        .eq('payment_status', 'requested')
        .eq('company_id', profile.company_id)

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
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return []

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return []

    const { data: requests, error } = await supabase
        .from('withdrawal_requests')
        .select(`
            *,
            users (
                name,
                phone,
                company_id
            )
        `)
        .eq('users.company_id', profile.company_id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching withdrawal requests:', error)
        return []
    }

    return requests
}

export async function getPendingWithdrawalCount() {
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return 0

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return 0

    const { count, error } = await supabase
        .from('withdrawal_requests')
        .select('*, users!inner(company_id)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('users.company_id', profile.company_id)

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

    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return []

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return []

    const { data: workers, error } = await supabase
        .from('users')
        .select('id, name, phone, email, worker_type, current_money, account_info, initial_password, status, created_at, display_color, commission_rate')
        .eq('role', 'worker')
        .eq('company_id', profile.company_id)
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
                .select('company_id, companies(name, code)')
                .eq('id', adminUser.id)
                .single()

            if (adminProfile) {
                companyId = adminProfile.company_id
                const company = (adminProfile.companies as any)
                if (company && company.name && company.code) {
                    companyName = `${company.name}#${company.code}`
                } else {
                    companyName = company?.name
                }
            }
        }

        console.log('Admin creating worker:', { adminId: adminUser?.id, companyId, companyName })

        // 2. Create auth user
        let userId = ''
        const normalizedLoginId = data.loginId.trim().toLowerCase()
        const email = `${normalizedLoginId}@cleanteam.temp`
        const password = data.password.trim()

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                name: data.name,
                phone: data.phone,
                role: 'worker',
                company_name: companyName // Trigger uses this to find company_id
            }
        })

        if (authError) {
            // NUCLEAR OPTION: If user already exists, DELETE and recreate to ensure clean state
            if (authError.message.includes('already registered') || authError.status === 422) {
                console.log('🔄 계정 중복 발견: 기존 계정 삭제 후 재생성 시도...', email)

                // 1. Find existing user ID (Search all pages to be sure)
                const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
                const found = authUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())

                if (found) {
                    const oldUserId = found.id
                    console.log('🗑️ 기존 계정 및 프로필 삭제 중:', oldUserId)

                    // Delete profile first (to avoid orphan records if possible, though upsert handles it)
                    await adminClient.from('users').delete().eq('id', oldUserId)
                    // Delete auth user (This clears invalid states/passwords)
                    await adminClient.auth.admin.deleteUser(oldUserId)

                    // 2. Try creating again fresh
                    const { data: retryData, error: retryError } = await adminClient.auth.admin.createUser({
                        email: email,
                        password: password,
                        email_confirm: true,
                        user_metadata: {
                            name: data.name,
                            phone: data.phone,
                            role: 'worker',
                            company_name: companyName
                        }
                    })

                    if (retryError) throw new Error(`계정 재생성 실패: ${retryError.message}`)
                    userId = retryData.user.id
                } else {
                    throw new Error(`계정이 이미 존재한다고 하지만 찾을 수 없습니다: ${authError.message}`)
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
                initial_password: password // Save trimmed password
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

export async function approveWorker(userId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('users')
            .update({ status: 'active' })
            .eq('id', userId)

        if (error) {
            console.error('Approve worker error:', error)
            throw new Error(error.message)
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Approve worker unexpected error:', error)
        return { success: false, error: error.message || '승인 처리 중 오류가 발생했습니다.' }
    }
}

export async function updateWorkerColor(
    userId: string,
    color: string | null
): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('users')
            .update({ display_color: color })
            .eq('id', userId)
            .eq('role', 'worker')

        if (error) {
            console.error('Update color error:', error)
            throw new Error(error.message)
        }

        revalidatePath('/admin/users')
        revalidatePath('/admin/sites')
        return { success: true }
    } catch (error) {
        console.error('Update worker color error:', error)
        return { success: false, error: '색상 변경 중 오류가 발생했습니다.' }
    }
}

export async function updateWorkerCommission(
    userId: string,
    rate: number
): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        if (rate < 0 || rate > 100) {
            return { success: false, error: '퍼센티지는 0~100 사이여야 합니다.' }
        }

        const { error } = await supabase
            .from('users')
            .update({ commission_rate: rate })
            .eq('id', userId)
            .eq('role', 'worker')

        if (error) {
            console.error('Update commission error:', error)
            throw new Error(error.message)
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Update worker commission error:', error)
        return { success: false, error: '퍼센티지 변경 중 오류가 발생했습니다.' }
    }
}


export async function getAdminLogs() {
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return []

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return []

    const { data: logs, error } = await supabase
        .from('wallet_logs')
        .select(`
            *,
            user:users(name)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching admin logs:', error)
        return []
    }

    return logs
}
