'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthStateListener() {
    const router = useRouter()

    useEffect(() => {
        const supabase = createClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                // When auth state changes (even from another tab), force the server components to re-evaluate
                router.refresh()
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    return null
}
