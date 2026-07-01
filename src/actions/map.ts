'use server'

type LatLng = { lat: number; lng: number }

export async function getKakaoDrivingRoute(origin: LatLng, destination: LatLng) {
    const KAKAO_REST_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_KEY
    if (!KAKAO_REST_KEY) {
        throw new Error("Missing NEXT_PUBLIC_KAKAO_REST_KEY")
    }

    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}`

    try {
        const res = await fetch(url, {
            headers: {
                Authorization: `KakaoAK ${KAKAO_REST_KEY}`
            },
            // Cache appropriately or no-store if we need real-time traffic
            cache: 'no-store'
        })

        if (!res.ok) {
            console.error('Failed to fetch Kakao directions:', await res.text())
            // return null to falback to straight line
            return null
        }

        const data = await res.json()
        
        if (data.routes && data.routes.length > 0) {
            const summary = data.routes[0].summary
            const sections = data.routes[0].sections
            
            // Extract the polyline points
            const linePath: LatLng[] = []
            if (sections && sections.length > 0) {
                sections[0].roads.forEach((road: any) => {
                    const vertexes = road.vertexes
                    for (let i = 0; i < vertexes.length; i += 2) {
                        linePath.push({
                            lng: vertexes[i],
                            lat: vertexes[i + 1]
                        })
                    }
                })
            }

            return {
                distance: summary.distance, // meters
                duration: summary.duration, // seconds
                path: linePath
            }
        }
        
        return null
    } catch (e) {
        console.error('Error fetching Kakao directions:', e)
        return null
    }
}

export async function getFallbackAddress(query: string) {
    if (!query) return null
    try {
        const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(query + ' 주소')}`
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })
        if (!res.ok) return null
        const html = await res.text()

        const addressRegex = /(?:(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣]*[시도]\s+)?(?:[가-힣]+[구군시]\s+)?(?:[가-힣]+[동면읍리]\s+)?(?:[가-힣A-Za-z\d]+[로길]\s+\d+(?:-\d+)?)/g
        const matches = html.match(addressRegex) || []

        const citiesAndProvinces = ['서울', '인천', '대전', '대구', '광주', '울산', '부산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
        const filtered = matches.filter(addr => {
            if (!addr.includes(' ')) return false
            const hasCity = citiesAndProvinces.some(c => addr.startsWith(c))
            const hasDistrict = /[구군시]\s+/.test(addr)
            const hasDong = /[동면읍리]\s+/.test(addr)
            return hasCity || hasDistrict || hasDong
        })

        if (filtered.length > 0) {
            const unique = Array.from(new Set(filtered))
            return unique[0]
        }
        return null
    } catch (e) {
        console.error('getFallbackAddress error:', e)
        return null
    }
}
