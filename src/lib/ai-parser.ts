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
  "name": "현장명 (아파트/건물명 + 동 + 호수)",
  "address": "도로명 또는 지번 주소 (동/호수 제외)",
  "cleaning_date": "YYYY-MM-DD 형식 (올해는 2026년)",
  "start_time": "HH:MM 형식 (24시간)",
  "structure_type": "구조 정보 (예: 방3 화2 베1)",
  "residential_type": "주거형태 (아파트/빌라/오피스텔 등)",
  "area_size": "평수 (예: 20평)",
  "special_notes": "특이사항, 추가 서비스, 청소 종류 등 모든 부가 정보",
  "balance_amount": 잔금(숫자만, 만원 단위면 x10000),
  "collection_type": "site"
}

규칙:
- 텍스트에 여러 오더가 있으면 마지막(가장 아래) 오더만 파싱
- "성함", "입금자명", "고객명" 등 다양한 필드명을 동일하게 인식
- 날짜에 연도가 없으면 2026년으로 가정. "26년"도 2026년
- "잔금 14만원" → balance_amount: 140000
- "잔금 입금완료", "잔금 입금", "정산 완료" → balance_amount: 0
- "잔금 없음" 또는 언급 없으면 → balance_amount: 0
- **현장명(name)**: 아파트/건물명 + 동 + 호수 조합 (예: "수루배마을4단지 408동 203호", "세진빌 302호", "한라비발디 105동 1003호")
- **주소(address)**: 시/구/도로명 또는 지번까지만. 동/호수는 절대 포함하지 않음 (예: "세종시 시청대로500", "충북 충주시 주덕읍 화곡로 1111")
- **시간 처리**: 
  - "오전 8시" 또는 "오전 8~9시" → start_time: "08:00"
  - 정확한 시간 없이 "오전"만 있으면 → start_time: "" 그리고 special_notes 맨 앞에 "⏰ 청소시간 해피콜 진행, " 추가
  - 정확한 시간 없이 "오후"만 있으면 → start_time: "" 그리고 special_notes 맨 앞에 "⏰ 청소시간 해피콜 진행, " 추가
  - 시간 언급 전혀 없으면 → start_time: "" 그리고 special_notes 맨 앞에 "⏰ 청소시간 해피콜 진행, " 추가
- collection_type은 기본 "site". "회사수금" 또는 "업체수금"이면 "company"
- 추가 서비스(코팅, 방역 등)는 special_notes에 포함
- 연락처가 2개 이상이면 / 로 구분
- "분양평수"는 area_size로, "방3화2베3"은 structure_type으로 추출`

function cleanJsonResponse(text: string): string {
    let cleaned = text.trim()
    // Remove markdown code blocks if present
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '')
        cleaned = cleaned.replace(/\n?```$/, '')
    }
    return cleaned.trim()
}

async function parseWithNvidia(orderText: string, apiKey: string): Promise<ParsedOrder | null> {
    try {
        console.log('Attempting order parsing with NVIDIA Llama 3.1 70B...')
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'meta/llama-3.1-70b-instruct',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `--- 오더 텍스트 ---\n${orderText}` }
                ],
                temperature: 0.1,
                max_tokens: 1024,
                response_format: { type: "json_object" }
            }),
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            const errData = await response.text()
            console.error('NVIDIA API returned error status:', response.status, errData)
            return null
        }

        const result = await response.json()
        const rawText = result.choices?.[0]?.message?.content
        if (!rawText) {
            console.warn('NVIDIA API returned empty content.')
            return null
        }

        const cleaned = cleanJsonResponse(rawText)
        const parsed: ParsedOrder = JSON.parse(cleaned)

        if (!parsed.name && !parsed.address) {
            console.warn('NVIDIA parsed result is missing key fields (name/address).')
            return null
        }

        console.log('Successfully parsed order with NVIDIA NIM!')
        return parsed
    } catch (error) {
        console.error('Error during NVIDIA NIM parsing:', error)
        return null
    }
}

export async function parseOrderWithAI(orderText: string): Promise<{
    success: boolean
    data?: ParsedOrder
    provider?: 'nvidia' | 'gemini'
    error?: string
}> {
    // 1. Try NVIDIA NIM first if key is configured
    const nvidiaKey = process.env.NVIDIA_API_KEY
    if (nvidiaKey) {
        const nvidiaResult = await parseWithNvidia(orderText, nvidiaKey)
        if (nvidiaResult) {
            return { success: true, data: nvidiaResult, provider: 'nvidia' }
        }
        console.warn('NVIDIA NIM parsing failed or returned null, falling back to Google Gemini...')
    } else {
        console.log('NVIDIA_API_KEY not configured, using Google Gemini directly.')
    }

    // 2. Fallback to Google Gemini
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
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
            console.log(`Attempting fallback order parsing with Gemini (${model})...`)
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    next: { revalidate: 0 }
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

            const cleaned = cleanJsonResponse(text)
            const parsed: ParsedOrder = JSON.parse(cleaned)

            if (!parsed.name && !parsed.address) {
                console.warn('Gemini parsed result is missing key fields (name/address).')
                continue
            }

            console.log(`Successfully parsed order with Gemini (${model})!`)
            return { success: true, data: parsed, provider: 'gemini' }
        } catch (error: any) {
            console.error(`AI parsing error (${model}):`, error)
            continue
        }
    }

    return { success: false, error: 'AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.' }
}
