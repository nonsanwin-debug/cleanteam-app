'use client'

import { useEffect } from 'react'

export function PushSubscriber() {
    useEffect(() => {
        // 로그인된 페이지에서 푸시 구독 보장
        if ('Notification' in window) {
            import('@/lib/push-notifications').then(({ subscribePush }) => {
                subscribePush().catch(() => { })
            })
        }
    }, [])

    return null
}
