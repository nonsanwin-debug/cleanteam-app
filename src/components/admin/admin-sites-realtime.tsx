'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AdminSitesRealtime() {
    const router = useRouter()

    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel('admin_sites_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sites'
                },
                (payload) => {
                    console.log('Admin: Site update detected', payload)
                    // Refresh the page to show updated data
                    router.refresh()
                }
            )
            .subscribe()

        // Polling fallback (every 5 seconds)
        const pollInterval = setInterval(() => {
            router.refresh()
        }, 5000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(pollInterval)
        }
    }, [router])

    return null // This component doesn't render anything
}
