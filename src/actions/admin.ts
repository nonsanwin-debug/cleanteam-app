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

export async function approvePayment(siteId: string, userId: string, amount: number): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        // 1. Update Site Status to 'paid'
        const { error: siteError } = await supabase
            .from('sites')
            .update({ payment_status: 'paid' })
            .eq('id', siteId)

        if (siteError) throw new Error(siteError.message)

        // 2. Increment User's Current Money using RPC or read-modify-write
        // Since we don't have an atomic increment RPC ready (unless we make one), we'll read-modify-write.
        // Ideally we should use RPC for atomicity.

        // Let's create a simple RPC for this later if needed, but for now:
        const { data: user } = await supabase.from('users').select('current_money').eq('id', userId).single()
        const currentMoney = user?.current_money || 0
        const newMoney = currentMoney + amount

        const { error: userError } = await supabase
            .from('users')
            .update({ current_money: newMoney })
            .eq('id', userId)

        if (userError) throw new Error(userError.message)

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Payment approval error:', error)
        return { success: false, error: '지급 처리 중 오류가 발생했습니다.' }
    }
}

export async function processWithdrawal(requestId: string, action: 'paid' | 'rejected', rejectionReason?: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        // 1. Get Request
        const { data: request, error: fetchError } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (fetchError || !request) return { success: false, error: '출금 요청을 찾을 수 없습니다.' }

        if (request.status !== 'pending') return { success: false, error: '이미 처리된 요청입니다.' }

        if (action === 'paid') {
            // Simply update status
            const { error } = await supabase
                .from('withdrawal_requests')
                .update({ status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', requestId)

            if (error) throw error
        } else {
            // Rejected: Refund money
            const { error: updateError } = await supabase
                .from('withdrawal_requests')
                .update({
                    status: 'rejected',
                    rejection_reason: rejectionReason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)

            if (updateError) throw updateError

            // Refund
            // Read-modify-write for simplicity
            const { data: user } = await supabase.from('users').select('current_money').eq('id', request.user_id).single()
            if (user) {
                await supabase
                    .from('users')
                    .update({ current_money: (user.current_money || 0) + request.amount })
                    .eq('id', request.user_id)
            }
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Process Withdrawal Error:', error)
        return { success: false, error: '출금 처리 중 오류가 발생했습니다.' }
    }
}
