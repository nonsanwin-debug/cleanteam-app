'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function registerAdminRobust(formData: any) {
    const { username, password, name, phone, companyName } = formData;
    const adminClient = createAdminClient();

    try {
        const generatedEmail = `${username}@cleanteam.temp`;

        // 1. Create the Auth user via Admin API
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: generatedEmail,
            email_confirm: true,
            password: password,
            user_metadata: {
                name: name,
                phone: phone,
                role: 'admin',
                company_name: companyName
            }
        });

        if (authError) {
            console.error('Auth Creation Error:', authError);
            if (authError.message.includes('already registered') || authError.status === 422 || authError.message.includes('duplicate')) {
                return { success: false, error: '이미 사용중인 아이디입니다. 다른 아이디를 입력해주세요.' };
            }
            return { success: false, error: authError.message };
        }

        const userId = authData.user.id;
        const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

        // 2. Explicitly create the Company (Because the DB trigger fails due to missing company_code constraint)
        const { data: compData, error: compError } = await adminClient
            .from('companies')
            .insert({
                name: companyName,
                code: code,
                company_code: code,
                owner_id: userId,
                status: 'approved'
            })
            .select()
            .single();

        let companyId = null;

        if (compError) {
            console.error('Company Creation Error:', compError);
            // If it failed because another company exists, try to get it
            const { data: existingComp } = await adminClient
                .from('companies')
                .select('id')
                .eq('name', companyName)
                .single();
            if (existingComp) companyId = existingComp.id;
        } else {
            companyId = compData.id;
        }

        // 3. Upsert the User profile directly
        const { error: profileError } = await adminClient
            .from('users')
            .upsert({ 
                id: userId,
                company_id: companyId,
                name: name,
                phone: phone,
                role: 'admin',
                status: 'active',
                email: generatedEmail
            });

        if (profileError) {
            console.error('Profile upsert error:', profileError);
            return { success: false, error: '프로필 생성 중 오류가 발생했습니다.' };
        }

        return { success: true };
    } catch (e: any) {
        console.error('Fatal Registration Error:', e);
        return { success: false, error: '서버 에러가 발생했습니다.' };
    }
}
