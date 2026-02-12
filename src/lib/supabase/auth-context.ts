import { createClient } from './server'

/**
 * 인증된 사용자와 소속 회사 정보를 한 번에 조회합니다.
 * admin.ts, sites.ts 등에서 20회+ 반복되던 보일러플레이트를 통합합니다.
 */
export async function getAuthCompany() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { supabase, user: null, companyId: null }

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

    return {
        supabase,
        user,
        companyId: profile?.company_id ?? null
    }
}
