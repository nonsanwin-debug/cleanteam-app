'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut(redirectTo: string = '/auth/login') {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect(redirectTo)
}
