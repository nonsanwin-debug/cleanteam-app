'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type ActionResponse<T = any> = {
    success: boolean
    error?: string
    data?: T
}

/**
 * 회원가입 시 소속(업체명+코드)이 실제로 존재하는지 검증
 * Service Role Key를 사용하여 RLS를 우회하고 조회합니다.
 */
export async function verifyCompany(name: string, code: string): Promise<ActionResponse<{ id: string, name: string, code: string }>> {
    try {
        const supabaseAdmin = createAdminClient()
        
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('id, name, code')
            .eq('name', name.trim())
            .eq('code', code.trim())
            .single()
            
        if (error || !data) {
            return { success: false, error: '없는 소속입니다. 업체명과 코드를 다시 확인해주세요.' }
        }
        
        return { success: true, data }
    } catch (err) {
        console.error('Error verifying company:', err)
        return { success: false, error: '소속 확인 중 오류가 발생했습니다.' }
    }
}
