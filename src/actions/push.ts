'use server'

import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// VAPID 설정
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:cleanteam@example.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    )
}

// 구독 정보 저장
export async function savePushSubscription(subscription: {
    endpoint: string
    p256dh: string
    auth: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '인증되지 않은 사용자' }

    // 사용자의 company_id 조회
    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

    // upsert로 중복 방지
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: user.id,
            company_id: profile?.company_id,
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
        }, {
            onConflict: 'user_id,endpoint'
        })

    if (error) {
        console.error('Push subscription save error:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// 구독 해제
export async function removePushSubscription(endpoint: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)

    return { success: true }
}

// 특정 사용자에게 푸시 알림 발송
export async function sendPushToUser(
    userId: string,
    payload: { title: string; body: string; url?: string; tag?: string }
) {
    try {
        const supabase = await createClient()

        const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('user_id', userId)

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No push subscriptions for user ${userId}`)
            return
        }

        const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/',
            tag: payload.tag || 'notification',
            icon: '/icons/icon-192.png',
        })

        const results = await Promise.allSettled(
            subscriptions.map(sub =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth }
                    },
                    pushPayload
                ).catch(async (err: any) => {
                    // 만료된 구독은 삭제
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await supabase
                            .from('push_subscriptions')
                            .delete()
                            .eq('endpoint', sub.endpoint)
                        console.log('Removed expired subscription:', sub.endpoint)
                    }
                    throw err
                })
            )
        )

        const sent = results.filter(r => r.status === 'fulfilled').length
        console.log(`Push sent to ${sent}/${subscriptions.length} subscriptions for user ${userId}`)
    } catch (error) {
        console.error('sendPushToUser error:', error)
    }
}

// 회사 관리자들에게 푸시 알림 발송
export async function sendPushToAdmins(
    companyId: string,
    payload: { title: string; body: string; url?: string; tag?: string }
) {
    try {
        const supabase = await createClient()

        // 해당 회사의 관리자 목록 조회
        const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', companyId)
            .eq('role', 'admin')

        if (!admins || admins.length === 0) return

        // 각 관리자에게 알림 발송
        await Promise.allSettled(
            admins.map(admin => sendPushToUser(admin.id, payload))
        )
    } catch (error) {
        console.error('sendPushToAdmins error:', error)
    }
}
