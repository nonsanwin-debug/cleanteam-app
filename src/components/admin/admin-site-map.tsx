/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Search, Calendar as CalendarIcon, Loader2, Navigation } from 'lucide-react'
import { format, subDays, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface SiteLocation {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    distance?: number // km
    duration?: number // minutes
    workerName?: string
    startTime?: string
}

export function AdminSiteMap() {
    const mapRef = useRef<HTMLDivElement>(null)
    const [map, setMap] = useState<any>(null)
    const [geocoder, setGeocoder] = useState<any>(null)
    
    const [targetDate, setTargetDate] = useState(new Date())
    const [sites, setSites] = useState<SiteLocation[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [markers, setMarkers] = useState<any[]>([])
    const [infowindows, setInfowindows] = useState<any[]>([])
    
    // Address Search
    const [searchQuery, setSearchQuery] = useState('')
    const [searchMarker, setSearchMarker] = useState<any>(null)
    const [searchLocation, setSearchLocation] = useState<{lat: number, lng: number} | null>(null)
    const [polylines, setPolylines] = useState<any[]>([])

    // 1. 카카오맵 로드 대기 및 초기화
    useEffect(() => {
        const initMap = () => {
            if (window.kakao && window.kakao.maps && mapRef.current) {
                window.kakao.maps.load(() => {
                    const options = {
                        center: new window.kakao.maps.LatLng(37.566826, 126.9786567), // 기본 서울 시청
                        level: 8,
                    }
                    const newMap = new window.kakao.maps.Map(mapRef.current, options)
                    setMap(newMap)
                    
                    // 주소-좌표 변환 객체 생성
                    const newGeocoder = new window.kakao.maps.services.Geocoder()
                    setGeocoder(newGeocoder)
                })
            }
        }

        // 스크립트가 로드되었는지 확인 후 초기화
        const checkKakao = setInterval(() => {
            if (window.kakao && window.kakao.maps) {
                clearInterval(checkKakao)
                initMap()
            }
        }, 300)

        return () => clearInterval(checkKakao)
    }, [])

    // 2. 날짜 변경 시 해당 날짜의 현장 데이터 불러오기
    useEffect(() => {
        const fetchSites = async () => {
            setIsLoading(true)
            const supabase = createClient()
            
            // 시작과 끝 시간 (KST 기준)
            const startOfDay = new Date(targetDate)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(targetDate)
            endOfDay.setHours(23, 59, 59, 999)

            const { data, error } = await supabase
                .from('sites')
                .select(`
                    id, name, address, created_at, cleaning_date, start_time,
                    site_workers: site_workers (
                        users: worker_id (name, role)
                    )
                `)
                .or(`cleaning_date.gte.${startOfDay.toISOString()},and(cleaning_date.is.null,created_at.gte.${startOfDay.toISOString()})`)

            if (data && data.length > 0) {
                // 정확히 해당 날짜에 속하는것만 필터링 (cleaning_date 우선)
                const filtered = data.filter(s => {
                    const d = new Date(s.cleaning_date || s.created_at)
                    return d >= startOfDay && d <= endOfDay
                })
                
                // 주소를 좌표로 변환 (비동기 배열 처리)
                if (geocoder && map) {
                    convertAddressesToCoords(filtered)
                }
            } else {
                setSites([])
                clearMarkers()
                setIsLoading(false)
            }
        }

        fetchSites()
    }, [targetDate, geocoder, map])

    // 3. 주소를 카카오맵 좌표로 변환 및 지도 이동
    const convertAddressesToCoords = async (rawSites: any[]) => {
        const bounds = new window.kakao.maps.LatLngBounds()
        const newSites: SiteLocation[] = []
        
        let processedCount = 0

        if(rawSites.length === 0) {
            setSites([])
            clearMarkers()
            setIsLoading(false)
            return
        }

        rawSites.forEach((site) => {
            geocoder.addressSearch(site.address, (result: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    const position = new window.kakao.maps.LatLng(result[0].y, result[0].x)
                    bounds.extend(position)
                    
                    // Extract worker name (getting the first one or finding the leader if possible)
                    let wName = ''
                    if (site.site_workers && site.site_workers.length > 0) {
                        const firstWorker = site.site_workers[0]?.users
                        wName = firstWorker ? firstWorker.name : ''
                    }

                    newSites.push({
                        id: site.id,
                        name: site.name,
                        address: site.address,
                        lat: Number(result[0].y),
                        lng: Number(result[0].x),
                        workerName: wName,
                        startTime: site.start_time
                    })
                }
                
                processedCount++
                if (processedCount === rawSites.length) {
                    setSites(newSites)
                    drawSiteMarkers(newSites)
                    if (newSites.length > 0) {
                        map.setBounds(bounds)
                    }
                    setIsLoading(false)
                    
                    // 만약 이미 검색된 위치가 있다면 거리 재계산
                    if (searchLocation) {
                        calculateDistances(newSites, searchLocation)
                    }
                }
            })
        })
    }

    // 마커 및 오버레이 초기화
    const clearMarkers = () => {
        markers.forEach(m => m.setMap(null))
        infowindows.forEach(i => i.setMap(null))
        polylines.forEach(p => p.setMap(null))
        setMarkers([])
        setInfowindows([])
        setPolylines([])
    }

    // 현장 마커 그리기
    const drawSiteMarkers = (siteList: SiteLocation[]) => {
        clearMarkers()
        
        const newMarkers: any[] = []
        const newInfos: any[] = []

        siteList.forEach(site => {
            const position = new window.kakao.maps.LatLng(site.lat, site.lng)
            
            // 파란색 기본 마커
            const marker = new window.kakao.maps.Marker({
                map: map,
                position: position,
                title: site.name
            })
            
            // 인포윈도우 (현장 이름 라벨)
            const infoText = [
                site.name,
                site.workerName ? `담당: ${site.workerName}` : null,
                site.startTime ? `시간: ${site.startTime}` : null,
            ].filter(Boolean).join(' | ')

            const content = `<div class="bg-white px-2 py-1 rounded shadow-md border border-slate-200 text-xs font-bold text-slate-800 whitespace-nowrap -translate-y-2">${infoText}</div>`
            const customOverlay = new window.kakao.maps.CustomOverlay({
                map: map,
                position: position,
                content: content,
                yAnchor: 2.5
            })

            newMarkers.push(marker)
            newInfos.push(customOverlay)
        })

        setMarkers(newMarkers)
        setInfowindows(newInfos)
    }

    // 4. 특정 주소 검색 및 거리 계산
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery || !geocoder || !map) return

        geocoder.addressSearch(searchQuery, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const lat = Number(result[0].y)
                const lng = Number(result[0].x)
                const position = new window.kakao.maps.LatLng(lat, lng)

                // 기존 검색 마커 제거
                if (searchMarker) {
                    searchMarker.setMap(null)
                }

                // 빨간색 마커 생성 (검색 위치)
                const imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"
                const imageSize = new window.kakao.maps.Size(24, 35)
                const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize)
                
                const newSearchMarker = new window.kakao.maps.Marker({
                    map: map,
                    position: position,
                    image: markerImage,
                    title: "검색 위치"
                })

                setSearchMarker(newSearchMarker)
                setSearchLocation({lat, lng})

                // 지도 포커스 이동 (검색된 곳과 핀들이 모두 보이게)
                const bounds = new window.kakao.maps.LatLngBounds()
                bounds.extend(position)
                sites.forEach(s => bounds.extend(new window.kakao.maps.LatLng(s.lat, s.lng)))
                map.setBounds(bounds)

                // 선 그리기 및 거리 계산
                calculateDistances(sites, {lat, lng})

            } else {
                alert('주소를 찾을 수 없습니다. 정확한 도로명/지번을 입력해주세요.')
            }
        })
    }

    const handleSearchClear = () => {
        setSearchQuery('')
        setSearchMarker((prev: any) => {
            if (prev) prev.setMap(null)
            return null
        })
        setSearchLocation(null)
        setPolylines((prev: any[]) => {
            prev.forEach(p => p.setMap(null))
            return []
        })
        setSites((prev: SiteLocation[]) => prev.map(s => ({ ...s, distance: undefined, duration: undefined })))
    }

    // 거리/시간 계산 및 선(Polyline) 그리기
    const calculateDistances = async (siteList: SiteLocation[], centerCoords: {lat: number, lng: number}) => {
        setIsLoading(true)
        
        // 기존 폴리라인 제거
        setPolylines((prev: any[]) => {
            prev.forEach(p => p.setMap(null))
            return []
        })
        
        const newPolylines: any[] = []

        try {
            // 카카오 네비게이션 서버 액션 (동적 임포트)
            const { getKakaoDrivingRoute } = await import('@/actions/map')

            const updatedSites = await Promise.all(siteList.map(async (site) => {
                const origin = { lat: centerCoords.lat, lng: centerCoords.lng }
                const destination = { lat: site.lat, lng: site.lng }
                
                const routeData = await getKakaoDrivingRoute(origin, destination)
                
                if (routeData) {
                    const kakaoPath = routeData.path.map((p: any) => new window.kakao.maps.LatLng(p.lat, p.lng))
                    const polyline = new window.kakao.maps.Polyline({
                        path: kakaoPath,
                        strokeWeight: 4,
                        strokeColor: '#3b82f6', // 파란 라인
                        strokeOpacity: 0.8,
                        strokeStyle: 'solid'
                    })
                    polyline.setMap(map)
                    newPolylines.push(polyline)

                    return {
                        ...site,
                        distance: routeData.distance / 1000, 
                        duration: Math.round(routeData.duration / 60)
                    }
                } else {
                    // 서버 오류 또는 길찾기 실패 시 직선 하버사인 거리로 대체
                    const linePath = [
                        new window.kakao.maps.LatLng(origin.lat, origin.lng),
                        new window.kakao.maps.LatLng(destination.lat, destination.lng)
                    ]
                    const polyline = new window.kakao.maps.Polyline({
                        path: linePath,
                        strokeWeight: 2,
                        strokeColor: '#ef4444',
                        strokeOpacity: 0.7,
                        strokeStyle: 'dashed'
                    })
                    polyline.setMap(map)
                    newPolylines.push(polyline)
                    const distanceMeter = polyline.getLength()

                    return {
                        ...site,
                        distance: distanceMeter / 1000
                    }
                }
            }))

            // 시간(거리)순 정렬
            updatedSites.sort((a, b) => {
                if (a.duration !== undefined && b.duration !== undefined) {
                    return a.duration - b.duration
                }
                return (a.distance || 0) - (b.distance || 0)
            })
            
            setPolylines(newPolylines)
            setSites(updatedSites)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const prevDay = () => {
        handleSearchClear()
        setTargetDate(subDays(targetDate, 1))
    }
    const nextDay = () => {
        handleSearchClear()
        setTargetDate(addDays(targetDate, 1))
    }

    return (
        <Card className="shadow-sm border-slate-200 mt-6 lg:mt-8 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
                <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        일일 현장 지도 현황판
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">선택한 날짜의 작업 현장 위치와 동선을 한눈에 파악하세요.</p>
                </div>
                
                {/* Date Controller */}
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm">
                    <Button variant="ghost" size="sm" onClick={prevDay} className="h-8">이전</Button>
                    <div className="flex items-center gap-2 px-2 font-bold text-slate-700 min-w-[120px] justify-center">
                        <CalendarIcon className="w-4 h-4 text-blue-500" />
                        {format(targetDate, 'yyyy. MM. dd')}
                    </div>
                    <Button variant="ghost" size="sm" onClick={nextDay} className="h-8">다음</Button>
                </div>
            </CardHeader>
            
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-4 h-[600px]">
                    
                    {/* Sidebar / List */}
                    <div className="md:col-span-1 border-r border-slate-200 bg-slate-50 flex flex-col h-[300px] md:h-full">
                        <div className="p-4 bg-white border-b border-slate-100">
                            <form onSubmit={handleSearch} className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input 
                                    placeholder="주소 검색 (거리 측정용)" 
                                    value={searchQuery}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setSearchQuery(val)
                                        if (!val) {
                                            handleSearchClear()
                                        }
                                    }}
                                    className="pl-9 bg-slate-50"
                                />
                            </form>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2">
                            {isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-500" />
                                    <span className="text-sm">지도 정보 불러오는 중...</span>
                                </div>
                            ) : sites.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                    <MapPin className="w-8 h-8 mb-2 opacity-20" />
                                    <span className="text-sm">해당 날짜에 배정된 현장이 없습니다.</span>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {sites.map((site) => (
                                        <li key={site.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors cursor-pointer"
                                            onClick={() => {
                                                if (map) {
                                                    map.panTo(new window.kakao.maps.LatLng(site.lat, site.lng))
                                                }
                                            }}
                                        >
                                            <div className="font-semibold text-slate-800">{site.name}</div>
                                            <div className="text-sm text-slate-500 truncate" title={site.address}>{site.address}</div>
                                            {(site.workerName || site.startTime) && (
                                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                                    {site.workerName && <span>담당: {site.workerName}</span>}
                                                    {site.startTime && <span>시작: {site.startTime}</span>}
                                                </div>
                                            )}
                                            {site.duration !== undefined ? (
                                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="text-[10px] font-medium text-blue-500 flex items-center gap-1">
                                                        <Navigation className="w-3 h-3" />
                                                        차량 약 {site.duration}분 예상 ({site.distance?.toFixed(1)}km)
                                                    </span>
                                                </div>
                                            ) : site.distance !== undefined && (
                                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                                        <Navigation className="w-3 h-3 text-slate-300" />
                                                        직선 {site.distance.toFixed(1)}km 떨어짐 (예상 시간 불가)
                                                    </span>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="p-3 bg-slate-100 border-t border-slate-200 text-xs text-slate-500 text-center font-medium">
                            총 {sites.length}개의 현장
                        </div>
                    </div>
                    
                    {/* Map Area */}
                    <div className="md:col-span-3 relative h-full min-h-[300px]">
                        <div ref={mapRef} className="w-full h-full" />
                        
                        {/* Map Center Aim */}
                        {!isLoading && sites.length > 0 && (
                             <div className="absolute top-4 right-4 z-10">
                                <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="shadow-md font-bold"
                                    onClick={() => {
                                        if(!map) return;
                                        const bounds = new window.kakao.maps.LatLngBounds()
                                        sites.forEach(s => bounds.extend(new window.kakao.maps.LatLng(s.lat, s.lng)))
                                        if(searchLocation) {
                                            bounds.extend(new window.kakao.maps.LatLng(searchLocation.lat, searchLocation.lng))
                                        }
                                        map.setBounds(bounds)
                                    }}
                                >
                                    한눈에 보기
                                </Button>
                             </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
// 글로벌 타입 선언 (window.kakao)
declare global {
    interface Window {
        kakao: any;
    }
}
