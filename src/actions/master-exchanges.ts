'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyMasterAccess } from './master'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getPointExchanges() {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, data: [], error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('withdrawal_requests')
            .select('*, company:companies(name, code), user:users(name, phone)')
            .eq('bank_name', '네이버페이 포인트')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('getPointExchanges fetch error:', error)
            return { success: false, data: [], error: '데이터를 불러오는 중 오류가 발생했습니다.' }
        }

        return { success: true, data: data || [] }
    } catch (e: any) {
        console.error('getPointExchanges error:', e)
        return { success: false, error: e.message || '조회 중 오류가 발생했습니다.', data: [] }
    }
}

export async function approvePointExchange(requestId: string) {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { data: req } = await adminClient
            .from('withdrawal_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (!req || req.status !== 'pending') {
            return { success: false, error: '유효하지 않은 요청이거나 이미 처리되었습니다.' }
        }

        const { error } = await adminClient
            .from('withdrawal_requests')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', requestId)

        if (error) throw error

        revalidatePath('/master/point-exchanges')
        return { success: true }
    } catch (e: any) {
        console.error('approvePointExchange error:', e)
        return { success: false, error: e.message || '승인 중 오류가 발생했습니다.' }
    }
}

export async function rejectPointExchange(requestId: string, reason: string = '') {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { data: req } = await adminClient
            .from('withdrawal_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (!req || req.status !== 'pending') {
            return { success: false, error: '유효하지 않은 요청이거나 이미 처리되었습니다.' }
        }

        // 1. Update status to rejected
        const { error: updateError } = await adminClient
            .from('withdrawal_requests')
            .update({ 
                status: 'rejected', 
                rejection_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId)

        if (updateError) throw updateError

        // 2. Refund points to company
        if (req.company_id && req.amount > 0) {
            const { data: company } = await adminClient
                .from('companies')
                .select('points')
                .eq('id', req.company_id)
                .single()

            if (company) {
                const newPoints = (company.points || 0) + req.amount
                await adminClient
                    .from('companies')
                    .update({ points: newPoints })
                    .eq('id', req.company_id)

                // 3. Log refund
                await adminClient
                    .from('wallet_logs')
                    .insert({
                        company_id: req.company_id,
                        amount: req.amount,
                        type: 'manual_add',
                        description: `[환불] 네이버페이 포인트 교환 반려${reason ? ` (${reason})` : ''}`
                    })
            }
        }

        revalidatePath('/master/point-exchanges')
        return { success: true }
    } catch (e: any) {
        console.error('rejectPointExchange error:', e)
        return { success: false, error: e.message || '반려 중 오류가 발생했습니다.' }
    }
}
