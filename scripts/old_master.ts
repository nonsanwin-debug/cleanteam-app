'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Action Responses
export type ActionResponse = {
    success: boolean
    error?: string
}

async function verifyMasterAccess() {
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
        .select(`
            *,
            owner:users!companies_owner_id_fkey(name, email, phone)
        `)
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
        if (!isMaster) return { success: false, error: '沅뚰븳???놁뒿?덈떎.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .update({ status })
            .eq('id', companyId)

        if (error) {
            console.error('Error updating company status:', error)
            return { success: false, error: '?곹깭 ?낅뜲?댄듃???ㅽ뙣?덉뒿?덈떎.' }
        }

        revalidatePath('/master/companies')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        return { success: false, error: '?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
    }
}

export async function manageCompanyPoints(companyId: string, amount: number, actionType: 'add' | 'deduct'): Promise<ActionResponse> {
    try {
        if (amount <= 0) {
            return { success: false, error: '?щ컮瑜?湲덉븸???낅젰?섏꽭??' }
        }

        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '沅뚰븳???놁뒿?덈떎.' }

        const adminClient = createAdminClient()
        
        // 1. Get current company point
        const { data: company, error: fetchError } = await adminClient
            .from('companies')
            .select('points, name')
            .eq('id', companyId)
            .single()
            
        if (fetchError || !company) {
            return { success: false, error: '?낆껜 ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎.' }
        }

        let newBalance = company.points || 0
        if (actionType === 'add') {
            newBalance += amount
        } else {
            newBalance -= amount
            if (newBalance < 0) {
                return { success: false, error: '?낆껜???붿뿬 ?ъ씤?몃낫???ш쾶 李④컧?????놁뒿?덈떎.' }
            }
        }

        // 2. Update company points
        const { error: updateError } = await adminClient
            .from('companies')
            .update({ points: newBalance })
            .eq('id', companyId)

        if (updateError) {
            console.error('Error updating company points:', updateError)
            return { success: false, error: '?ъ씤??泥섎━???ㅽ뙣?덉뒿?덈떎.' }
        }

        // 3. Log (master_logs or wallet_logs) - Optional: could insert into wallet_logs as type 'system_add' to track master movements
        const { error: logError } = await adminClient
            .from('wallet_logs')
            .insert({
                company_id: companyId,
                type: actionType === 'add' ? 'manual_add' : 'manual_deduct',
                amount: amount,
                balance_after: newBalance,
                description: `留덉뒪??愿由ъ옄 ${actionType === 'add' ? '?ъ씤??異⑹쟾' : '?ъ씤???섏닔'}`
            })

        if (logError) {
            console.warn('Could not log master point change:', logError)
        }

        revalidatePath('/master/companies')
        return { success: true }
    } catch (error) {
        return { success: false, error: '?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
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

export async function deleteUserForce(userId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '沅뚰븳???놁뒿?덈떎.' }

        const adminClient = createAdminClient()

        // 1. Soft delete on `users` table
        const { error: profileError } = await adminClient
            .from('users')
            .update({ status: 'deleted' })
            .eq('id', userId)

        if (profileError) {
            console.error('Profile soft delete update error:', profileError)
            return { success: false, error: '?꾨줈???곹깭 ?낅뜲?댄듃 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
        }

        // 2. Scramble auth state to completely block login
        // NOT scrambling password so they can log back in easily upon restore IF we just change their metadata.
        // Or we just update their auth role to 'banned'.
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { status: 'deleted', role: 'banned' }
        })

        if (authError) {
            console.error('Auth user update error:', authError)
            return { success: false, error: '?몄쬆 ?뺣낫 鍮꾪솢?깊솕 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
        }

        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('deleteUserForce error:', error)
        return { success: false, error: '媛뺤젣 ?덊눜 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
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
        .select(`
            *,
            owner:users!companies_owner_id_fkey(name, email, phone)
        `)
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
        if (!isMaster) return { success: false, error: '沅뚰븳???놁뒿?덈떎.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .update({ status: 'approved' }) // Restore back to approved (or active depending on your logic)
            .eq('id', companyId)

        if (error) {
            console.error('Error restoring company error:', error)
            return { success: false, error: '?낆껜 蹂듦뎄 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
        }

        revalidatePath('/master/companies')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('restoreCompany error:', error)
        return { success: false, error: '蹂듦뎄 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
    }
}

export async function restoreUser(userId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '沅뚰븳???놁뒿?덈떎.' }

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
            return { success: false, error: '?뚯썝 ?꾨줈??蹂듦뎄 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
        }

        // 2. Restore auth user metadata
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { status: 'active', role: userProfile?.role || 'worker' }
        })

        if (authError) {
            console.error('Auth user restore error:', authError)
            return { success: false, error: '?뚯썝 ?몄쬆 ?뺣낫 蹂듦뎄 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
        }

        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('restoreUser error:', error)
        return { success: false, error: '蹂듦뎄 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' }
    }
}
