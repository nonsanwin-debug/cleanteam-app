'use server'

type ParsedOrder = {
    customer_name: string
    customer_phone: string
    name: string       // 현장명
    address: string
    cleaning_date: string  // YYYY-MM-DD
    start_time: string     // HH:MM
    structure_type: string
    residential_type: string
    area_size: string
    special_notes: string
    balance_amount: number
    collection_type: 'site' | 'company'
}

const SYSTEM_PROMPT = `당신은 청소 업체의 오더 텍스트를 분석하는 AI입니다.
아래 텍스트에서 정보를 추출하여 JSON으로 반환하세요.

반드시 아래 형식의 JSON만 반환하세요 (다른 텍스트 없이):
{
  "customer_name": "고객 성함",
  "customer_phone": "연락처 (여러 개면 / 로 구분)",
  "name": "현장명 (건물명+호수, 없으면 주소에서 추출)",
  "address": "전체 주소",
  "cleaning_date": "YYYY-MM-DD 형식 (올해는 2026년)",
  "start_time": "HH:MM 형식 (24시간, 오전 8~9시면 08:00)",
  "structure_type": "구조 정보 (예: 방3 화2 베1)",
  "residential_type": "주거형태 (아파트/빌라/오피스텔 등)",
  "area_size": "평수 (예: 20평)",
  "special_notes": "특이사항, 추가 서비스, 청소 종류 등 모든 부가 정보",
  "balance_amount": 잔금(숫자만, 만원 단위면 x10000),
  "collection_type": "site"
}

규칙:
- 날짜에 연도가 없으면 2026년으로 가정
- "잔금 14만원" → balance_amount: 140000
- "잔금 없음" 또는 언급 없으면 → balance_amount: 0
- 현장명은 건물명+호수가 기본 (예: "세진빌 302호")
- 건물명이 없으면 주소의 마지막 부분 사용
- collection_type은 기본 "site"
- 추가 서비스(코팅, 방역 등)는 special_notes에 포함`

export async function parseOrderWithAI(orderText: string): Promise<{
    success: boolean
    data?: ParsedOrder
    error?: string
}> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        return { success: false, error: 'Gemini API Key가 설정되지 않았습니다.' }
    }

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash']
    const body = JSON.stringify({
        contents: [{
            parts: [{
                text: `${SYSTEM_PROMPT}\n\n--- 오더 텍스트 ---\n${orderText}`
            }]
        }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
        }
    })

    for (const model of models) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body
                }
            )

            if (response.status === 429) {
                console.warn(`${model} rate limited, trying next model...`)
                await new Promise(r => setTimeout(r, 1000))
                continue
            }

            if (!response.ok) {
                const errorData = await response.text()
                console.error(`Gemini API error (${model}):`, errorData)
                continue
            }

            const result = await response.json()
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text

            if (!text) continue

            const parsed: ParsedOrder = JSON.parse(text)

            if (!parsed.name && !parsed.address) {
                return { success: false, error: '현장명 또는 주소를 추출할 수 없습니다.' }
            }

            return { success: true, data: parsed }
        } catch (error: any) {
            console.error(`AI parsing error (${model}):`, error)
            continue
        }
    }

    return { success: false, error: 'AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.' }
}
