'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { ActionResponse } from './master'

export async function registerPartnerAccount(
    name: string,
    phone: string,
    email: string,
    password: string
): Promise<ActionResponse> {
    try {
        const adminClient = createAdminClient()

        // 1. Create auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
                role: 'partner',
                status: 'active'
            }
        })

        if (authError) {
            console.error('Error creating partner auth user:', authError)
            return { success: false, error: '계정 생성에 실패했습니다. 이미 가입된 이메일이거나 형식에 맞지 않습니다.' }
        }

        const userId = authData.user.id

        // 2. Create a Company record for this partner
        const { data: newCompany, error: companyError } = await adminClient
            .from('companies')
            .insert({
                name: name,
                status: 'approved',
                // Optional: we can generate a random code or just a placeholder code since they are partners
                code: Math.floor(1000 + Math.random() * 9000).toString() 
            })
            .select('id')
            .single()

        if (companyError || !newCompany) {
            console.error('Error creating partner company:', companyError)
            await adminClient.auth.admin.deleteUser(userId)
            return { success: false, error: '부동산 업체 상태 초기화에 실패했습니다.' }
        }

        // 3. Upsert into public.users with the new company_id
        const { error: profileError } = await adminClient
            .from('users')
            .upsert({
                id: userId,
                name: name,
                email: email,
                phone: phone,
                role: 'partner',
                status: 'active',
                company_id: newCompany.id
            }, { onConflict: 'id' })

        if (profileError && profileError.code !== '23505') {
            console.error('Error upserting partner profile:', profileError)
        } else {
             await adminClient
            .from('users')
            .update({
                name: name,
                email: email,
                phone: phone,
                role: 'partner',
                status: 'active',
                company_id: newCompany.id
            }).eq('id', userId)
        }

        return { success: true }
    } catch (error) {
        console.error('registerPartnerAccount error:', error)
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}
