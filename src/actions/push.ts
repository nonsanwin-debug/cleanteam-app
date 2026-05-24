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

// 채팅 오프라인 참여자들에게 푸시 알림 발송
export async function sendChatPushNotification(
    siteId: string,
    senderName: string,
    message: string,
    onlineKeys: string[] // ["이름_역할", ...]
) {
    try {
        const supabase = await createClient()

        // 1. 해당 현장 채팅방의 영구 참여자 목록 조회
        const { data: participants } = await supabase
            .from('site_chat_participants')
            .select('*')
            .eq('site_id', siteId)

        if (!participants || participants.length === 0) return

        // 2. 현재 온라인이 아니고, 본인이 아닌 참여자 필터링
        const offlineParticipants = participants.filter(p => {
            const key = `${p.name}_${p.role}`
            const isOnline = onlineKeys.includes(key)
            const isSender = p.name === senderName
            return !isOnline && !isSender
        })

        if (offlineParticipants.length === 0) return

        // 3. 페이로드 구성
        const title = `[NEXUS] ${senderName}님의 새 메시지`
        const body = message.length > 50 ? `${message.substring(0, 50)}...` : message
        const url = `/share/${siteId}` // 알림 클릭 시 해당 현장 공유 페이지로 유도

        const pushPayload = JSON.stringify({
            title,
            body,
            url,
            tag: `chat_${siteId}`,
            icon: '/icons/icon-192.png',
        })

        const sendPromises: Promise<any>[] = []

        for (const p of offlineParticipants) {
            // A. 자체 수신 푸시 토큰이 포함된 게스트/고객인 경우
            if (p.push_endpoint && p.push_p256dh && p.push_auth) {
                sendPromises.push(
                    webpush.sendNotification(
                        {
                            endpoint: p.push_endpoint,
                            keys: { p256dh: p.push_p256dh, auth: p.push_auth }
                        },
                        pushPayload
                    ).catch(async (err: any) => {
                        // 만료된 구독 토큰 자동 초기화
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            await supabase
                                .from('site_chat_participants')
                                .update({
                                    push_endpoint: null,
                                    push_p256dh: null,
                                    push_auth: null
                                })
                                .eq('id', p.id)
                        }
                    })
                )
            }

            // B. user_id를 갖는 정식 회원(작업팀/관리자 등)인 경우, push_subscriptions를 매칭하여 모두 발송
            if (p.user_id) {
                const { data: subs } = await supabase
                    .from('push_subscriptions')
                    .select('endpoint, p256dh, auth')
                    .eq('user_id', p.user_id)

                if (subs && subs.length > 0) {
                    for (const sub of subs) {
                        sendPromises.push(
                            webpush.sendNotification(
                                {
                                    endpoint: sub.endpoint,
                                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                                },
                                pushPayload
                            ).catch(async (err: any) => {
                                if (err.statusCode === 410 || err.statusCode === 404) {
                                    await supabase
                                        .from('push_subscriptions')
                                        .delete()
                                        .eq('endpoint', sub.endpoint)
                                }
                            })
                        )
                    }
                }
            }
        }

        await Promise.allSettled(sendPromises)
    } catch (error) {
        console.error('sendChatPushNotification error:', error)
    }
}
