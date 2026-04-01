'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. 캐쉬 충전 요청 (파트너 -> 마스터)
export async function requestCashRecharge(amount: number, method: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: '인증되지 않은 사용자입니다.' }
        }

        // Get user's company
        const { data: profile } = await supabase
            .from('users')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return { success: false, error: '업체 관리자만 충전 요청을 할 수 있습니다.' }
        }

        const { error } = await supabase
            .from('cash_requests')
            .insert({
                company_id: profile.company_id,
                amount,
                method,
                status: 'pending'
            })

        if (error) throw error

        revalidatePath('/admin/recharge')
        return { success: true }
    } catch (e: any) {
        console.error('requestCashRecharge error:', e)
        return { success: false, error: e.message || '충전 요청 중 오류가 발생했습니다.' }
    }
}

// 2. 캐쉬 -> 포인트 전환 (비율 1:1000, 즉 1캐쉬 = 1000포인트)
export async function convertCashToPoints(amount: number) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: '인증되지 않은 사용자입니다.' }
        }

        // Get user's company and current cash
        const { data: profile } = await supabase
            .from('users')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return { success: false, error: '업체 관리자만 전환할 수 있습니다.' }
        }

        const { data: company } = await supabase
            .from('companies')
            .select('cash, points')
            .eq('id', profile.company_id)
            .single()

        if (!company) {
            return { success: false, error: '업체 정보를 찾을 수 없습니다.' }
        }

        if ((company.cash || 0) < amount) {
            return { success: false, error: '보유 캐쉬가 부족합니다.' }
        }

        // Transaction simulation: deduct cash, add points
        const { error } = await supabase.rpc('convert_cash_to_points', {
            p_company_id: profile.company_id,
            p_amount: amount,
            p_rate: 1000
        })

        if (error) {
            console.error('convert_cash_to_points RPC not found, falling back to manual update. Error:', error)
            // Fallback if RPC doesn't exist
            const newCash = (company.cash || 0) - amount
            const newPoints = (company.points || 0) + (amount * 1000)

            const { error: updateError } = await supabase
                .from('companies')
                .update({ cash: newCash, points: newPoints })
                .eq('id', profile.company_id)
            
            if (updateError) throw updateError
        }

        revalidatePath('/admin/recharge')
        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (e: any) {
        console.error('convertCashToPoints error:', e)
        return { success: false, error: e.message || '전환 중 오류가 발생했습니다.' }
    }
}

// 3. (마스터) 충전 요청 내역 조회
export async function getCashRequests() {
    try {
        const supabase = await createClient()

        // Admin client is usually needed for cross-tenant querying
        const supabaseAdmin = await import('@supabase/ssr').then(m => m.createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )).catch(() => supabase) // Fallback to normal client if no service key

        const { data, error } = await supabaseAdmin
            .from('cash_requests')
            .select('*, company:companies(name, code)')
            .order('created_at', { ascending: false })

        if (error) {
            // Fallback for RLS issues if normal client used
            const { data: fallbackData } = await supabase
                .from('cash_requests')
                .select('*, company:companies(name, code)')
                .order('created_at', { ascending: false })
            return { success: true, data: fallbackData || [] }
        }

        return { success: true, data }
    } catch (e: any) {
        console.error('getCashRequests error:', e)
        return { success: false, error: e.message || '조회 중 오류가 발생했습니다.', data: [] }
    }
}

// 4. (마스터) 충전 승인
export async function approveCashRequest(requestId: string) {
    try {
        const supabase = await createClient()
        
        // Use service role if available for master actions
        const supabaseAdmin = await import('@supabase/ssr').then(m => m.createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )).catch(() => supabase)

        // Lock row? Just get it
        const { data: req } = await supabaseAdmin
            .from('cash_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (!req || req.status !== 'pending') {
            return { success: false, error: '유효하지 않은 요청이거나 이미 처리되었습니다.' }
        }

        // Get company
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('cash')
            .eq('id', req.company_id)
            .single()

        // Update company cash
        const newCash = (company?.cash || 0) + req.amount
        await supabaseAdmin.from('companies')
            .update({ cash: newCash })
            .eq('id', req.company_id)

        // Update request status
        await supabaseAdmin.from('cash_requests')
            .update({ status: 'approved' })
            .eq('id', requestId)

        revalidatePath('/master/cash-requests')
        return { success: true }
    } catch (e: any) {
        console.error('approveCashRequest error:', e)
        return { success: false, error: e.message || '승인 중 오류가 발생했습니다.' }
    }
}

// 5. (마스터) 충전 반려
export async function rejectCashRequest(requestId: string) {
    try {
        const supabase = await createClient()
        
        const supabaseAdmin = await import('@supabase/ssr').then(m => m.createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )).catch(() => supabase)

        const { error } = await supabaseAdmin.from('cash_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId)

        if (error) throw error

        revalidatePath('/master/cash-requests')
        return { success: true }
    } catch (e: any) {
        console.error('rejectCashRequest error:', e)
        return { success: false, error: e.message || '반려 중 오류가 발생했습니다.' }
    }
}
