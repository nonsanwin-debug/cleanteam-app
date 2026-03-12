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
