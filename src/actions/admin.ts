'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthCompany } from '@/lib/supabase/auth-context'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types'

export async function getUsersWithClaims() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, phone, email, worker_type, current_money, account_info, status, created_at, display_color, commission_rate')
        .eq('role', 'worker')
        .eq('company_id', companyId)
        .neq('status', 'deleted')
        .order('name')

    if (error) {
        console.error('Error fetching users:', error)
        return []
    }

    // Fetch pending claims for each user in the same company
    const { data: claims } = await supabase
        .from('sites')
        .select('id, name, worker_id, claimed_amount, payment_status, created_at, claimed_by')
        .eq('payment_status', 'requested')
        .eq('company_id', companyId)

    // Attach claims to users (claimed_by가 있으면 실제 청구자, 없으면 worker_id로 fallback)
    const usersWithClaims = users.map(user => {
        const userClaims = claims?.filter(c => (c.claimed_by || c.worker_id) === user.id) || []
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
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

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
        .eq('users.company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching withdrawal requests:', error)
        return []
    }

    return requests
}

export async function getPendingWithdrawalCount() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return 0

    const { count, error } = await supabase
        .from('withdrawal_requests')
        .select('*, users!inner(company_id)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('users.company_id', companyId)

    if (error) {
        console.error('Error fetching pending withdrawal count:', error)
        return 0
    }

    return count || 0
}

export async function approvePayment(siteId: string, userId: string, amount: number): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        // 1. Fetch site info (name, additional_amount, payment_status)
        const { data: site, error: siteError } = await supabase
            .from('sites')
            .select('name, additional_amount, payment_status, company_id')
            .eq('id', siteId)
            .single()

        if (siteError || !site) {
            return { success: false, error: '현장 정보를 찾을 수 없습니다.' }
        }

        if (site.payment_status === 'paid') {
            return { success: false, error: '이미 지급 완료 처리된 현장입니다.' }
        }

        // 2. Fetch worker's commission_rate
        const { data: worker } = await supabase
            .from('users')
            .select('commission_rate, current_money')
            .eq('id', userId)
            .single()

        const commissionRate = worker?.commission_rate ?? 100

        // 2.5 Fetch company points
        const { data: companyData } = await supabase
            .from('companies')
            .select('points')
            .eq('id', site.company_id)
            .single()

        const companyPoints = companyData?.points || 0
        if (companyPoints < amount) {
            return { success: false, error: '업체의 잔여 포인트가 부족하여 정산을 승인할 수 없습니다. (마스터 충전 필요)' }
        }

        // 3. Update site payment status
        const { error: siteUpdateError } = await supabase
            .from('sites')
            .update({ payment_status: 'paid', updated_at: new Date().toISOString() } as any)
            .eq('id', siteId)

        if (siteUpdateError) {
            return { success: false, error: '현장 상태 업데이트에 실패했습니다.' }
        }

        // 3.5 Deduct company points
        const { error: companyUpdateError } = await supabase
            .from('companies')
            .update({ points: companyPoints - amount })
            .eq('id', site.company_id)

        if (companyUpdateError) {
            console.error('Company points deduction error:', companyUpdateError)
            return { success: false, error: '업체 포인트 차감에 실패했습니다.' }
        }

        // 4. Update worker balance
        const newBalance = (worker?.current_money || 0) + amount
        const { error: balanceError } = await supabase
            .from('users')
            .update({ current_money: newBalance })
            .eq('id', userId)

        if (balanceError) {
            return { success: false, error: '잔액 업데이트에 실패했습니다.' }
        }

        // 5. Insert wallet log with commission description
        const description = `커미션: ${site.name || '현장'} (추가금 ${commissionRate}%)`
        const { error: logError } = await supabase
            .from('wallet_logs')
            .insert({
                user_id: userId,
                company_id: site.company_id,
                type: 'commission',
                amount: amount,
                balance_after: newBalance,
                description: description,
                reference_id: siteId
            })

        if (logError) {
            console.error('Wallet log insert error:', logError)
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Payment approval unexpected error:', error)
        return { success: false, error: `시스템 오류: ${error.message || '알 수 없는 오류'}` }
    }
}

export async function rejectClaim(siteId: string, reason: string): Promise<ActionResponse> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '업체 정보를 찾을 수 없습니다.' }

        // 1. 현장 정보 조회 (worker_id, name, additional_amount)
        const { data: site, error: siteError } = await supabase
            .from('sites')
            .select('name, additional_amount, worker_id, claimed_by')
            .eq('id', siteId)
            .eq('company_id', companyId)
            .single()

        if (siteError || !site) {
            return { success: false, error: '현장 정보를 찾을 수 없습니다.' }
        }

        // 2. sites 테이블 업데이트
        const { error } = await supabase
            .from('sites')
            .update({
                payment_status: 'rejected',
                rejection_reason: reason,
                updated_at: new Date().toISOString()
            } as any)
            .eq('id', siteId)
            .eq('company_id', companyId)

        if (error) {
            console.error('Reject claim error:', error)
            return { success: false, error: '청구 반려 처리에 실패했습니다: ' + error.message }
        }

        // 3. wallet_logs에 반려 기록 추가
        const workerId = site.claimed_by || site.worker_id
        if (workerId) {
            const { error: logError } = await supabase
                .from('wallet_logs')
                .insert({
                    user_id: workerId,
                    company_id: companyId,
                    type: 'manual_deduct',
                    amount: site.additional_amount || 0,
                    balance_after: 0,
                    description: `비용청구 반려: ${site.name || '현장'} (사유: ${reason})`,
                    reference_id: siteId
                })

            if (logError) {
                console.error('Reject wallet log error:', logError)
            }
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Reject claim unexpected error:', error)
        return { success: false, error: `시스템 오류: ${error.message || '알 수 없는 오류'}` }
    }
}

export async function processWithdrawal(requestId: string, action: 'paid' | 'rejected', rejectionReason?: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        // 1. 먼저 출금 요청 정보 조회 (wallet_logs 기록용)
        const { data: request } = await supabase
            .from('withdrawal_requests')
            .select('user_id, amount, users(name, current_money, company_id)')
            .eq('id', requestId)
            .single()

        // 2. Use RPC function for atomic updates and RLS bypass
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

        // 3. 지급완료 시 기존 withdrawal_request 로그의 상태를 업데이트
        if (action === 'paid' && request) {
            const user = request.users as any
            const workerName = user?.name || '알 수 없음'

            // 기존 withdrawal_request 로그를 withdrawal_paid로 업데이트
            const { error: logError } = await supabase
                .from('wallet_logs')
                .update({
                    type: 'withdrawal_paid',
                    description: `출금 지급완료: ${workerName} ${request.amount.toLocaleString()}원`,
                })
                .eq('reference_id', requestId)
                .eq('type', 'withdrawal_request')

            if (logError) {
                console.error('Withdrawal wallet log update error:', logError)
            }
        }

        // 4. 반려 시 기존 로그를 withdrawal_refund로 업데이트
        if (action === 'rejected' && request) {
            const { error: logError } = await supabase
                .from('wallet_logs')
                .update({
                    type: 'withdrawal_refund',
                    description: `출금 반려${rejectionReason ? ': ' + rejectionReason : ''}`,
                })
                .eq('reference_id', requestId)
                .eq('type', 'withdrawal_request')

            if (logError) {
                console.error('Withdrawal refund wallet log update error:', logError)
            }
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
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data: workers, error } = await supabase
        .from('users')
        .select('id, name, phone, email, worker_type, current_money, account_info, initial_password, status, created_at, display_color, commission_rate')
        .eq('role', 'worker')
        .eq('company_id', companyId)
        .neq('status', 'deleted')
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
            if (authError.message.includes('already registered') || authError.status === 422 || authError.message.includes('duplicate')) {
                return { success: false, error: '이미 사용중인 아이디입니다. 다른 아이디를 입력해주세요.' }
            }
            throw new Error(authError.message)
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
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data: logs, error } = await supabase
        .from('wallet_logs')
        .select(`
            *,
            user:users(name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching admin logs:', error)
        return []
    }

    return logs
}

export async function getCommissionLogs() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data: logs, error } = await supabase
        .from('wallet_logs')
        .select('id, user_id, type, amount, balance_after, description, reference_id, created_at')
        .eq('company_id', companyId)
        .in('type', ['commission', 'manual_add', 'manual_deduct', 'withdrawal'])
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching commission logs:', error)
        return []
    }

    return logs
}

export async function adjustWorkerBalance(
    workerId: string,
    amount: number,
    type: 'add' | 'deduct',
    reason: string
): Promise<ActionResponse> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '업체 정보를 찾을 수 없습니다.' }

        // Get worker's current balance
        const { data: worker } = await supabase
            .from('users')
            .select('current_money, name, company_id')
            .eq('id', workerId)
            .single()

        if (!worker) return { success: false, error: '팀원을 찾을 수 없습니다.' }
        if (worker.company_id !== companyId) {
            return { success: false, error: '같은 업체의 팀원만 관리할 수 있습니다.' }
        }

        // Get company points
        const { data: companyData } = await supabase
            .from('companies')
            .select('points')
            .eq('id', companyId)
            .single()

        const companyPoints = companyData?.points || 0

        if (type === 'add' && companyPoints < amount) {
            return { success: false, error: '업체의 잔여 포인트가 부족합니다. (마스터 충전 필요)' }
        }

        const currentBalance = worker.current_money || 0
        const adjustAmount = type === 'add' ? amount : -amount
        const newBalance = currentBalance + adjustAmount

        if (newBalance < 0) {
            return { success: false, error: '잔액이 부족합니다.' }
        }

        // Update company points (Deduct on add, Refund on deduct)
        const newCompanyPoints = type === 'add' ? companyPoints - amount : companyPoints + amount;
        const { error: companyUpdateError } = await supabase
            .from('companies')
            .update({ points: newCompanyPoints })
            .eq('id', companyId)

        if (companyUpdateError) {
            console.error('Company points update error:', companyUpdateError)
            return { success: false, error: '업체 포인트 업데이트에 실패했습니다.' }
        }

        // Update balance
        const { error: updateError } = await supabase
            .from('users')
            .update({ current_money: newBalance })
            .eq('id', workerId)

        if (updateError) {
            console.error('Balance update error:', updateError)
            return { success: false, error: '잔액 업데이트에 실패했습니다.' }
        }

        // Insert wallet log
        const logType = type === 'add' ? 'manual_add' : 'manual_deduct'
        const description = type === 'add'
            ? `관리자 지급: ${reason}`
            : `관리자 차감: ${reason}`

        const { error: logError } = await supabase
            .from('wallet_logs')
            .insert({
                user_id: workerId,
                company_id: companyId,
                type: logType,
                amount: amount,
                balance_after: newBalance,
                description: description
            })

        if (logError) {
            console.error('Wallet log insert error:', logError)
            return { success: true, error: `잔액은 변경되었으나 정산기록 저장 실패: ${logError.message}` }
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('adjustWorkerBalance error:', error)
        return { success: false, error: '처리 중 오류가 발생했습니다.' }
    }
}

/** 팀원 삭제 (Soft Delete - 작업 내역 보존) */
export async function deleteWorker(workerId: string): Promise<ActionResponse> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '업체 정보를 찾을 수 없습니다.' }

        // 같은 업체 소속인지 확인
        const { data: worker } = await supabase
            .from('users')
            .select('id, name, company_id, role')
            .eq('id', workerId)
            .single()

        if (!worker) return { success: false, error: '팀원을 찾을 수 없습니다.' }
        if (worker.company_id !== companyId) return { success: false, error: '같은 업체의 팀원만 삭제할 수 있습니다.' }
        if (worker.role !== 'worker') return { success: false, error: '팀원만 삭제할 수 있습니다.' }

        const adminClient = createAdminClient()

        // 0. 진행 중이거나 예정된 현장만 추가금 청구자(claimed_by)를 null로 변경
        await adminClient
            .from('sites')
            .update({ claimed_by: null })
            .eq('claimed_by', workerId)
            .in('status', ['scheduled', 'in_progress'])

        // 1. 배정된 현장 중 진행/예정인 것만 담당자(worker_id)를 null로 변경
        await adminClient
            .from('sites')
            .update({ worker_id: null })
            .eq('worker_id', workerId)
            .in('status', ['scheduled', 'in_progress'])

        // 2. site_members에서 제거
        await adminClient
            .from('site_members')
            .delete()
            .eq('user_id', workerId)

        // 3. worker_hidden_sites에서 제거
        await adminClient
            .from('worker_hidden_sites')
            .delete()
            .eq('user_id', workerId)

        // 4. 삭제 처리 (status 업데이트)
        const { error: profileError } = await adminClient
            .from('users')
            .update({ status: 'deleted' })
            .eq('id', workerId)

        if (profileError) {
            console.error('Profile update error:', profileError)
            return { success: false, error: '프로필 상태 업데이트 중 오류가 발생했습니다.' }
        }

        // 5. Auth 사용자 접근 완전 차단 (이메일/비번 무작위 변경, 로그인 불가)
        const deletedEmail = `deleted_${workerId}_${Date.now()}@cleanteam.temp`;
        const randomPassword = crypto.randomUUID();
        const { error: authError } = await adminClient.auth.admin.updateUserById(workerId, {
            email: deletedEmail,
            password: randomPassword,
            user_metadata: { status: 'deleted' }
        })

        if (authError) {
            console.error('Auth user update error:', authError)
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('deleteWorker error:', error)
        return { success: false, error: '팀원 삭제 중 오류가 발생했습니다.' }
    }
}

// ============================================
// Company Settings Functions
// ============================================

export async function getCompanySettings() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return null

    const { data, error } = await supabase
        .from('companies')
        .select('id, name, code, sms_enabled, sms_bank_name, sms_account_number, sms_message_template, company_collection_message, promotion_page_enabled, promotion_contact_number')
        .eq('id', companyId)
        .single()

    if (error) {
        console.error('Error fetching company settings:', error)
        return null
    }

    return data
}

export async function updateCompanySettings(
    smsEnabled: boolean,
    smsBankName: string,
    smsAccountNumber: string,
    smsMessageTemplate: string,
    companyCollectionMessage?: string,
    promotionPageEnabled?: boolean,
    promotionContactNumber?: string
): Promise<ActionResponse> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '소속 업체를 찾을 수 없습니다.' }

        const { error } = await supabase
            .from('companies')
            .update({
                sms_enabled: smsEnabled,
                sms_bank_name: smsBankName,
                sms_account_number: smsAccountNumber,
                sms_message_template: smsMessageTemplate,
                company_collection_message: companyCollectionMessage || null,
                promotion_page_enabled: promotionPageEnabled || false,
                promotion_contact_number: promotionContactNumber || null
            })
            .eq('id', companyId)

        if (error) {
            console.error('Error updating company settings:', error)
            return { success: false, error: '설정 저장 실패: ' + error.message }
        }

        revalidatePath('/admin/settings')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in updateCompanySettings:', error)
        return { success: false, error: '설정 저장 중 오류가 발생했습니다.' }
    }
}

export async function togglePhotoFeatured(photoId: string, isFeatured: boolean) {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) throw new Error('Unauthorized')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.user_metadata?.role !== 'admin') {
            throw new Error('Unauthorized: Admin only')
        }

        const { error } = await supabase
            .from('photos')
            .update({ is_featured: isFeatured })
            .eq('id', photoId)

        if (error) {
            console.error('Error toggling photo featured status:', error)
            return { success: false, error: '대표 사진 설정 실패: ' + error.message }
        }

        revalidatePath('/admin/sites', 'layout')
        revalidatePath('/admin/promotion')
        return { success: true }
    } catch (error: any) {
        console.error('Unexpected error in togglePhotoFeatured:', error)
        return { success: false, error: error.message || '설정 저장 중 오류가 발생했습니다.' }
    }
}
