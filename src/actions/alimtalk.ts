'use server'

import { ActionResponse } from '@/types'

// Default template in case environment variable is not defined
const DEFAULT_ALIMTALK_TEMPLATE = `[NEXUS] 안녕하세요, #{고객명} 고객님!
신청하신 청소 작업이 성공적으로 마무리되었습니다.

■ 현장명: #{현장명}
■ 담당팀장: #{현장팀장}

아래 버튼 또는 보고서 확인용 주소를 클릭하시면 전/후 사진과 상세 작업 보고서를 확인하실 수 있습니다.

■ 보고서 링크: #{보고서링크}

더 나은 서비스로 보답하는 NEXUS가 되겠습니다. 감사합니다.`

/**
 * Clean placeholders in the template text
 */
function interpolateMessage(template: string, variables: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`#{${key}}`, 'g'), value)
        result = result.replace(new RegExp(`{${key}}`, 'g'), value)
    }
    return result
}

/**
 * Send Kakao AlimTalk to the customer when the site completion is triggered
 */
export async function sendAlimTalk(siteId: string): Promise<ActionResponse> {
    try {
        const apiKey = process.env.ALIGO_API_KEY
        const userId = process.env.ALIGO_USER_ID
        const senderKey = process.env.ALIGO_SENDER_KEY
        const sender = process.env.ALIGO_SENDER
        const templateCode = process.env.ALIGO_TEMPLATE_CODE
        const templateMessage = process.env.ALIGO_TEMPLATE_MESSAGE || DEFAULT_ALIMTALK_TEMPLATE
        const buttonName = process.env.ALIGO_BUTTON_NAME || ''
        const testMode = process.env.ALIGO_TEST_MODE || 'N'

        // Log configuration status
        if (!apiKey || !userId || !senderKey || !sender || !templateCode) {
            console.warn('⚠️ AlimTalk is not sent: Aligo API keys are missing in env.')
            return { 
                success: false, 
                error: '알림톡 발송 실패: 서버 환경 변수(API Key, User ID 등)가 설정되지 않았습니다.' 
            }
        }

        // 1. Fetch site details using admin client to ensure we bypass RLS for sending message
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const adminClient = createAdminClient()

        const { data: site, error: siteError } = await adminClient
            .from('sites')
            .select('id, name, customer_name, customer_phone, worker_name, balance_amount, additional_amount')
            .eq('id', siteId)
            .single()

        if (siteError || !site) {
            console.error('AlimTalk site query failed:', siteError)
            return { success: false, error: '현장 정보를 찾을 수 없습니다.' }
        }

        // Clean customer phone number
        const rawPhone = site.customer_phone || ''
        const cleanPhone = rawPhone.replace(/[^0-9]/g, '')
        if (!cleanPhone) {
            console.warn('⚠️ AlimTalk is not sent: Customer phone number is empty or invalid.')
            return { success: false, error: '수신자(고객)의 휴대전화 번호가 올바르지 않습니다.' }
        }

        // 2. Build report URL
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexuspartner.kr'
        const reportUrl = `${siteUrl}/share/${siteId}`

        // 3. Populate template variables
        const variables = {
            '고객명': site.customer_name || '고객',
            'customerName': site.customer_name || '고객',
            '현장명': site.name || '',
            'siteName': site.name || '',
            '현장팀장': site.worker_name || '팀장',
            'workerName': site.worker_name || '팀장',
            '보고서링크': reportUrl,
            'reportUrl': reportUrl,
            '잔금': String(site.balance_amount || 0),
            'balanceAmount': String(site.balance_amount || 0),
            '추가금': String(site.additional_amount || 0),
            'additionalAmount': String(site.additional_amount || 0),
            '합계금액': String((site.balance_amount || 0) + (site.additional_amount || 0)),
            'totalAmount': String((site.balance_amount || 0) + (site.additional_amount || 0))
        }

        const messageText = interpolateMessage(templateMessage, variables)

        // 4. Construct button if button name is configured
        let buttonConfig: string | undefined
        if (buttonName && buttonName.trim() !== '') {
            buttonConfig = JSON.stringify({
                button: [
                    {
                        name: buttonName,
                        linkType: 'WL',
                        linkMo: reportUrl,
                        linkPc: reportUrl
                    }
                ]
            })
        }

        // 5. Generate dynamic token from Aligo API (valid for 15 minutes)
        console.log('Generating Aligo token...')
        const tokenRes = await fetch('https://kakaoapi.aligo.in/akv10/token/create/15/i/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                apikey: apiKey,
                userid: userId
            })
        })

        if (!tokenRes.ok) {
            const errText = await tokenRes.text()
            console.error('Aligo Token API HTTP error:', tokenRes.status, errText)
            return { success: false, error: '알리고 토큰 생성 API 호출 중 HTTP 오류가 발생했습니다.' }
        }

        const tokenData = await tokenRes.json()
        if (tokenData.code !== 0) {
            console.error('Aligo Token creation failed:', tokenData)
            return { success: false, error: `알리고 토큰 발급 실패: ${tokenData.message}` }
        }

        const token = tokenData.token

        // 6. Send AlimTalk message
        const sendBody = new URLSearchParams()
        sendBody.append('apikey', apiKey)
        sendBody.append('userid', userId)
        sendBody.append('token', token)
        sendBody.append('senderkey', senderKey)
        sendBody.append('tpl_code', templateCode)
        sendBody.append('sender', sender)
        sendBody.append('receiver_1', cleanPhone)
        sendBody.append('subject_1', `[NEXUS] ${site.name} 작업 완료 보고서`)
        sendBody.append('message_1', messageText)

        if (buttonConfig) {
            sendBody.append('button_1', buttonConfig)
        }

        // Failover (Fallback to SMS/LMS if Kakao fails)
        sendBody.append('failover', 'Y')
        sendBody.append('fsubject_1', `[NEXUS] ${site.name} 작업 완료 보고서`)
        sendBody.append('fmessage_1', messageText)

        if (testMode === 'Y') {
            sendBody.append('testMode', 'Y')
            console.log('AlimTalk running in TEST MODE')
        }

        console.log(`Sending AlimTalk message via Aligo to ${cleanPhone}...`)
        const sendRes = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: sendBody
        })

        if (!sendRes.ok) {
            const errText = await sendRes.text()
            console.error('Aligo AlimTalk send API HTTP error:', sendRes.status, errText)
            return { success: false, error: '알림톡 발송 API 호출 중 HTTP 오류가 발생했습니다.' }
        }

        const sendData = await sendRes.json()
        if (sendData.code !== 0) {
            console.error('Aligo AlimTalk send failed:', sendData)
            return { success: false, error: `알림톡 발송 실패: ${sendData.message}` }
        }

        console.log('AlimTalk successfully processed by Aligo:', sendData)
        return { success: true, data: sendData }

    } catch (error) {
        console.error('Unexpected error in sendAlimTalk server action:', error)
        return { 
            success: false, 
            error: error instanceof Error ? error.message : '알 수 없는 서버 오류가 발생했습니다.' 
        }
    }
}
