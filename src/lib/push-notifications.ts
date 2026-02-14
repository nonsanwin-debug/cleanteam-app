'use client'

import { savePushSubscription, removePushSubscription } from '@/actions/push'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export async function subscribePush(): Promise<boolean> {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications not supported')
            return false
        }

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
            console.log('Push permission denied')
            return false
        }

        const registration = await navigator.serviceWorker.ready

        // 기존 구독이 있으면 반환
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidPublicKey) {
                console.error('VAPID public key not found')
                return false
            }

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
            })
        }

        // 서버에 구독 정보 저장
        const sub = subscription.toJSON()
        await savePushSubscription({
            endpoint: sub.endpoint!,
            p256dh: sub.keys!.p256dh!,
            auth: sub.keys!.auth!,
        })

        console.log('Push subscription saved')
        return true
    } catch (error) {
        console.error('Push subscription failed:', error)
        return false
    }
}

export async function unsubscribePush(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
            await removePushSubscription(subscription.endpoint)
            await subscription.unsubscribe()
        }

        return true
    } catch (error) {
        console.error('Push unsubscribe failed:', error)
        return false
    }
}
