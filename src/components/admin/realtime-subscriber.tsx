'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function RealtimeSubscriber() {
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        // Channel for Photos
        const channelPhotos = supabase
            .channel('realtime-photos')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'photos' },
                (payload) => {
                    console.log('New photo uploaded:', payload)
                    toast.info('새로운 현장 사진이 업로드되었습니다.', {
                        description: '모니터링 대시보드에서 확인하세요.'
                    })
                    router.refresh()
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sites' },
                (payload) => {
                    console.log('Site updated:', payload)
                    const newStatus = payload.new.status
                    const oldStatus = payload.old.status
                    if (newStatus !== oldStatus) {
                        toast.success(`현장 상태 변경: ${newStatus}`, {
                            description: `${payload.new.name || '현장'} 상태가 변경되었습니다.`
                        })
                        router.refresh()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channelPhotos)
        }
    }, [supabase, router])

    return null // This component doesn't render anything
}
