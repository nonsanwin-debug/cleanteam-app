'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
    try {
        const supabase = await createClient()
        await supabase.auth.signOut()
        return { success: true }
    } catch (error: any) {
        console.error('Logout Error:', error)
        return { success: false, error: error.message || '로그아웃 중 오류가 발생했습니다.' }
    }
}
