'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 네이버페이 포인트 교환 처리 (파트너 활동 포인트 차감)
export async function exchangeNaverPayPoints(amount: number) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: '인증되지 않은 사용자입니다.' }
        }

        // Get user's company
        const { data: profile } = await supabase
            .from('users')
            .select('name, company_id, role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'partner') {
            return { success: false, error: '파트너 계정만 교환을 신청할 수 있습니다.' }
        }

        if (!profile.company_id) {
            return { success: false, error: '소속된 업체 정보가 없습니다.' }
        }

        const supabaseAdmin = await import('@supabase/ssr').then(m => m.createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )).catch(() => supabase)

        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('points')
            .eq('id', profile.company_id)
            .single()

        if (!company) {
            return { success: false, error: '업체 정보를 찾을 수 없습니다.' }
        }

        if ((company.points || 0) < amount) {
            return { success: false, error: '보유한 포인트가 교환 금액보다 적습니다.' }
        }

        if (amount <= 0) {
            return { success: false, error: '교환할 포인트를 정확히 입력해주세요.' }
        }

        // Update company points (deduct)
        const newPoints = (company.points || 0) - amount
        const { error: updateError } = await supabaseAdmin
            .from('companies')
            .update({ points: newPoints })
            .eq('id', profile.company_id)

        if (updateError) throw updateError

        // Insert into wallet_logs
        await supabaseAdmin
            .from('wallet_logs')
            .insert({
                company_id: profile.company_id,
                amount: -amount,
                type: 'naver_pay_exchange',
                description: '[출금] 네이버페이 포인트 교환'
            })
            


        revalidatePath('/field/profile')
        return { success: true }
    } catch (e: any) {
        console.error('exchangeNaverPayPoints error:', e)
        return { success: false, error: e.message || '교환 처리 중 오류가 발생했습니다.' }
    }
}
