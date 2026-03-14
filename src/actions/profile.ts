'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use the service role key to bypass RLS for registration steps
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function completeUserProfile(data: {
  userId: string,
  role: string,
  companyInput: string,
  phone: string,
  bankName: string,
  bankAccountNumber: string,
  bankAccountHolder: string
}) {
  try {
    let companyId = null;

    if (data.role === 'worker') {
      const input = data.companyInput.trim()
      const [inputName, inputCode] = input.split('#')
      
      const { data: company, error } = await adminSupabase
          .from('companies')
          .select('id')
          .eq('name', inputName.trim())
          .eq('code', inputCode.trim())
          .single()
      
      if (error || !company) {
          return { success: false, message: '일치하는 소속 업체가 없습니다. 관리자에게 코드를 문의하세요.' }
      }
      companyId = company.id
    } else if (data.role === 'admin') {
      const inputName = data.companyInput.trim()
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString()
      
      // Upsert to handle potential conflicts safely
      const { data: newCompany, error } = await adminSupabase
          .from('companies')
          .insert([{ name: inputName, code: randomCode, owner_id: data.userId }])
          .select('id')
          .single()

      if (error || !newCompany) {
          return { success: false, message: '이미 존재하는 업체명이거나 시스템 오류입니다.' }
      }
      companyId = newCompany.id
    }

    // Update public.users
    const { error: userUpdateErr } = await adminSupabase
        .from('users')
        .update({
            role: data.role,
            company_id: companyId,
            phone: data.phone,
            bank_name: data.bankName,
            bank_account_number: data.bankAccountNumber,
            bank_account_holder: data.bankAccountHolder
        })
        .eq('id', data.userId)

    if (userUpdateErr) throw userUpdateErr

    // Update auth metadata
    await adminSupabase.auth.admin.updateUserById(data.userId, {
        user_metadata: {
            role: data.role,
            phone: data.phone,
            company_name: data.companyInput
        }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Profile completion error:', error)
    return { success: false, message: error.message || '서버 오류가 발생했습니다.' }
  }
}
