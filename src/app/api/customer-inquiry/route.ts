import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// CORS 허용 (Same AI 등 외부 도메인에서 호출 가능)
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

// OPTIONS (preflight)
export async function OPTIONS() {
    return NextResponse.json({}, { headers: CORS_HEADERS })
}

// POST: 견적 요청 접수
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // 필수 필드 검증
        const requiredFields = ['customer_name', 'customer_phone']
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { success: false, error: `${field}은(는) 필수 입력 항목입니다.` },
                    { status: 400, headers: CORS_HEADERS }
                )
            }
        }

        const payload = {
            customer_name: body.customer_name,
            customer_phone: body.customer_phone,
            clean_type: body.clean_type || '',
            structure_type: body.structure_type || '',
            address: body.address || '',
            detail_address: body.detail_address || '',
            area_size: body.area_size || '',
            work_date: body.work_date || '',
            time_preference: body.time_preference || '',
            building_condition: body.building_condition || '',
            notes: body.notes || '',
            image_urls: body.image_urls || [],
            status: 'pending',
        }

        const adminSupabase = createAdminClient()

        const { data, error } = await adminSupabase
            .from('customer_inquiries')
            .insert(payload)
            .select('id')
            .single()

        if (error) {
            console.error('API customer-inquiry insert error:', error)
            return NextResponse.json(
                { success: false, error: '접수 중 오류가 발생했습니다.' },
                { status: 500, headers: CORS_HEADERS }
            )
        }

        // 디스코드 알림 발송
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL
        if (webhookUrl) {
            const embedMsg = {
                content: "@everyone 🔔 새로운 문의 알림!",
                embeds: [{
                    title: "🚨 새로운 고객 예약 문의가 들어왔습니다!",
                    description: "📌 외부 페이지에서 접수된 문의입니다.",
                    color: 0xf43f5e, // Rose-500
                    fields: [
                        { name: "고객명", value: payload.customer_name, inline: true },
                        { name: "연락처", value: payload.customer_phone, inline: true },
                        { name: "\u200B", value: "\u200B", inline: false },
                        { name: "청소 일정", value: `${payload.work_date || '미정'} / ${payload.time_preference || '미정'}`, inline: true },
                        { name: "종류 및 건물", value: `${payload.clean_type || '미정'} / ${payload.structure_type || '미정'}`, inline: true },
                        { name: "평수 및 컨디션", value: `${payload.area_size || '미정'} / ${payload.building_condition || '미정'}`, inline: true },
                        { name: "현장 주소", value: `${payload.address || '미입력'} ${payload.detail_address}`.trim(), inline: false },
                        { name: "전할 말씀", value: payload.notes || "없음", inline: false }
                    ],
                    footer: { text: "NEXUS 플랫폼 자동 알림 (외부 페이지)" },
                    timestamp: new Date().toISOString()
                }]
            }

            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(embedMsg)
            }).catch(e => console.error('Discord Webhook Error (External):', e))
        }

        return NextResponse.json(
            { success: true, id: data?.id },
            { status: 200, headers: CORS_HEADERS }
        )
    } catch (err: any) {
        console.error('API customer-inquiry exception:', err)
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500, headers: CORS_HEADERS }
        )
    }
}
