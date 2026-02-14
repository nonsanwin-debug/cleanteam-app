'use client'

import { useEffect } from 'react'
import { subscribePush } from '@/lib/push-notifications'

export default function PWARegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(async (registration) => {
                    console.log('SW registered:', registration.scope)

                    // SW 등록 후 푸시 구독 시도
                    // 기존에 권한이 granted면 자동 구독, 아니면 나중에 요청
                    if (Notification.permission === 'granted') {
                        await subscribePush()
                    } else if (Notification.permission === 'default') {
                        // 3초 후 권한 요청 (UX 개선: 페이지 로드 직후 바로 물으면 거절률 높음)
                        setTimeout(async () => {
                            await subscribePush()
                        }, 3000)
                    }
                })
                .catch((error) => {
                    console.log('SW registration failed:', error)
                })
        }
    }, [])

    return null
}
