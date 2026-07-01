// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Search, Calendar as CalendarIcon, Loader2, Navigation, AlertCircle, Users, Share2 } from 'lucide-react'
import { format, subDays, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { assignSiteLeader } from '@/actions/sites'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface SiteLocation {
    id: string
    name: string
    address: string
    lat?: number
    lng?: number
    distance?: number // km
    duration?: number // minutes
    workerName?: string
    startTime?: string
    isFallback?: boolean // indicates the coordinate is a fallback (e.g. Dong/Myeon)
    worker_id?: string | null
    is_shared_out?: boolean
    shared_info?: any
    received_info?: any
    rawSite?: any
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

    // Site ID → Marker 매핑 (카드 호버 시 바운스 애니메이션용)
    const markerMapRef = useRef<Map<string, any>>(new Map())
    const bounceOverlayRef = useRef<any>(null)

    // 회사 필터링
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [workers, setWorkers] = useState<any[]>([])
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    // Sharing dialog states
    const [sharingSite, setSharingSite] = useState<any>(null)
    const [partnerCode, setPartnerCode] = useState('')
    const [isValidating, setIsValidating] = useState(false)
    const [validatedCompany, setValidatedCompany] = useState<any>(null)
    const [shareNotes, setShareNotes] = useState('')
    const [isSharing, setIsSharing] = useState(false)

    // 0. 로그인된 유저의 company_id 조회
    useEffect(() => {
        const fetchCompany = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('company_id')
                    .eq('id', user.id)
                    .single()
                if (profile?.company_id) {
                    setCompanyId(profile.company_id)
                }
            }
        }
        fetchCompany()
    }, [])

    // 0-1. 팀장 배정을 위한 작업자(workers) 목록 조회
    useEffect(() => {
        const fetchWorkers = async () => {
            const { getWorkers } = await import('@/actions/sites')
            const data = await getWorkers()
            setWorkers(data || [])
        }
        fetchWorkers()
    }, [])

    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1)

    async function handleAssignLeader(siteId: string, workerId: string | null) {
        try {
            const res = await assignSiteLeader(siteId, workerId)
            if (res.success) {
                toast.success('팀장이 변경되었습니다.')
                triggerRefresh()
            } else {
                toast.error(res.error || '팀장 변경 실패')
            }
        } catch (err: any) {
            toast.error('팀장 변경 중 오류가 발생했습니다.')
        }
    }

    async function handleValidateCompany() {
        if (!partnerCode) return
        setIsValidating(true)
        try {
            const { searchCompanyByCode } = await import('@/actions/shared-orders')
            const result = await searchCompanyByCode(partnerCode)
            if (result.found && result.companies && result.companies.length > 0) {
                const comp = result.companies[0]
                setValidatedCompany({
                    id: comp.id,
                    name: comp.name || '',
                    code: comp.code || ''
                })
                toast.success('파트너사가 매칭되었습니다.')
            } else {
                toast.error('해당 코드를 가진 업체를 찾을 수 없습니다.')
            }
        } catch (error) {
            toast.error('검증 중 오류가 발생했습니다.')
        } finally {
            setIsValidating(false)
        }
    }

    async function handleShareSite() {
        if (!sharingSite || !validatedCompany) return
        setIsSharing(true)
        try {
            const { shareSiteDirectly } = await import('@/actions/shared-orders')
            const result = await shareSiteDirectly(sharingSite.id, validatedCompany.id, shareNotes)
            if (result.success) {
                toast.success('성공적으로 오더가 직접 공유되었습니다.')
                setSharingSite(null)
                setPartnerCode('')
                setValidatedCompany(null)
                setShareNotes('')
                triggerRefresh()
            } else {
                toast.error(result.error || '오더 공유 실패')
            }
        } catch (error) {
            toast.error('오더 공유 처리 중 오류가 발생했습니다.')
        } finally {
            setIsSharing(false)
        }
    }

    function handleCloseShareDialog() {
        setSharingSite(null)
        setPartnerCode('')
        setValidatedCompany(null)
        setShareNotes('')
    }

    const [mapError, setMapError] = useState<string | null>(null)

    // 1. 카카오맵 로드 대기 및 초기화
    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        const initMap = () => {
            if (window.kakao && window.kakao.maps && mapRef.current) {
                window.kakao.maps.load(() => {
                    try {
                        const options = {
                            center: new window.kakao.maps.LatLng(37.566826, 126.9786567), // 기본 서울 시청
                            level: 8,
                        }
                        const newMap = new window.kakao.maps.Map(mapRef.current, options)
                        setMap(newMap)
                        
                        // 주소-좌표 변환 객체 생성
                        const newGeocoder = new window.kakao.maps.services.Geocoder()
                        setGeocoder(newGeocoder)
                        setMapError(null)
                    } catch (e: any) {
                        console.error('Kakao map init error:', e)
                        setMapError(`지도 초기화 실패: ${e.message}`)
                    }
                })
            }
        }

        // 스크립트가 로드되었는지 확인 후 초기화
        let attempts = 0
        const checkKakao = setInterval(() => {
            attempts++
            if (window.kakao && window.kakao.maps) {
                clearInterval(checkKakao)
                clearTimeout(timeoutId)
                initMap()
            } else if (attempts > 30) { // 9초 후 포기
                clearInterval(checkKakao)
                setMapError('카카오 지도 스크립트 로드 지연. 네트워크나 브라우저 확장프로그램(광고차단 등)을 확인해주세요.')
            }
        }, 300)

        timeoutId = setTimeout(() => {
            clearInterval(checkKakao)
            if (!mapError) setMapError('카카오 지도 서버에 연결할 수 없습니다.')
        }, 10000)

        return () => {
            clearInterval(checkKakao)
            clearTimeout(timeoutId)
        }
    }, [])

    // 시간 포맷을 이쁘게 (15:00 -> 오후 3시) 바꿔주는 헬퍼
    const formatKoreanTime = (timeStr?: string) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        const isPM = h >= 12;
        let hour = h % 12;
        if (hour === 0) hour = 12;
        const ampm = isPM ? "오후" : "오전";
        const minStr = m > 0 ? ` ${m}분` : '';
        const text = `${ampm} ${hour}시${minStr}`;
        const colorClass = isPM ? "text-orange-600" : "text-blue-600";
        return { text, colorClass, isPM };
    }

    // 2. 날짜 변경 시 해당 날짜의 현장 데이터 불러오기
    useEffect(() => {
        if (!companyId) return // 회사 정보가 아직 로드되지 않았으면 대기

        const fetchSites = async () => {
            setIsLoading(true)
            const supabase = createClient()
            
            // 시작과 끝 시간 (KST 기준)
            const startOfDay = new Date(targetDate)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(targetDate)
            endOfDay.setHours(23, 59, 59, 999)

            // Fetch sites
            const { data: sitesData, error } = await supabase
                .from('sites')
                .select(`
                    id, name, address, created_at, cleaning_date, start_time,
                    worker_id, status, customer_name, customer_phone,
                    residential_type, area_size, structure_type, special_notes,
                    balance_amount, additional_amount, additional_description, collection_type,
                    worker:users!worker_id (id, name)
                `)
                .eq('company_id', companyId)
                .not('is_deleted', 'is', true)
                .or(`cleaning_date.gte.${startOfDay.toISOString()},and(cleaning_date.is.null,created_at.gte.${startOfDay.toISOString()})`)

            if (sitesData && sitesData.length > 0) {
                // 정확히 해당 날짜에 속하는것만 필터링 (cleaning_date 우선)
                const filtered = sitesData.filter(s => {
                    const d = new Date(s.cleaning_date || s.created_at)
                    return d >= startOfDay && d <= endOfDay
                })

                // Fetch shared orders info to decorate sites
                const { data: sharedOrders } = await supabase
                    .from('shared_orders')
                    .select('id, status, parsed_details, accepted_by, transferred_site_id')
                    .eq('company_id', companyId)
                    .neq('status', 'deleted')

                const { data: receivedOrders } = await supabase
                    .from('shared_orders')
                    .select('id, status, company_id, transferred_site_id')
                    .eq('accepted_by', companyId)
                    .neq('status', 'deleted')

                const decorated = filtered.map((site: any) => {
                    const sharedInfo = sharedOrders?.find((so: any) => so.parsed_details?.original_site_id === site.id)
                    const receivedInfo = receivedOrders?.find((ro: any) => ro.transferred_site_id === site.id)
                    return {
                        ...site,
                        is_shared_out: !!sharedInfo && sharedInfo.status === 'transferred',
                        shared_info: sharedInfo || null,
                        received_info: receivedInfo || null
                    }
                })
                
                // 주소를 좌표로 변환 (비동기 배열 처리)
                if (geocoder && map) {
                    convertAddressesToCoords(decorated)
                }
            } else {
                setSites([])
                clearMarkers()
                setIsLoading(false)
            }
        }

        fetchSites()
    }, [targetDate, geocoder, map, companyId, refreshTrigger])

    // 3. 주소를 카카오맵 좌표로 변환 및 지도 이동
    const convertAddressesToCoords = async (rawSites: any[]) => {
        const bounds = new window.kakao.maps.LatLngBounds()
        const newSites: SiteLocation[] = []
        
        if(rawSites.length === 0) {
            setSites([])
            clearMarkers()
            setIsLoading(false)
            return
        }

        // Helper to promisify addressSearch
        const searchAddress = (address: string) => {
            return new Promise<any>((resolve) => {
                geocoder.addressSearch(address, (result: any, status: any) => {
                    if (status === window.kakao.maps.services.Status.OK) {
                        resolve(result[0])
                    } else {
                        resolve(null)
                    }
                })
            })
        }

        const places = new window.kakao.maps.services.Places()
        const searchPlaces = (keyword: string) => {
            return new Promise<any>((resolve) => {
                places.keywordSearch(keyword, (result: any, status: any) => {
                    if (status === window.kakao.maps.services.Status.OK) {
                        resolve(result[0])
                    } else {
                        resolve(null)
                    }
                })
            })
        }

        // Process sequentially to bypass Kakao API rate limits
        for (const site of rawSites) {
            let result = await searchAddress(site.address)
            let isFallback = false
            
            // 1. 주소 검색 실패 시 키워드(장소) 검색으로 시도 (e.g. 아파트 명칭)
            if (!result) {
                result = await searchPlaces(site.address)
            }

            // 2. 장소 검색도 실패했을 경우, 동/면/읍 단위로 추출해서 다시 검색해보기
            if (!result) {
                // Address pattern matching to find combinations of (시/도) (구/군) (동/면/읍)
                // e.g. "대전 서구 둔산동 123" -> matches "대전 서구 둔산동" or just "둔산동"
                const dongMatch = site.address.match(/([가-힣]+(시|도)\s+)?([가-힣]+(구|군)\s+)?([가-힣]+(동|면|읍))/);
                if (dongMatch && dongMatch[0]) {
                    result = await searchAddress(dongMatch[0])
                    if (result) {
                        isFallback = true
                    }
                }
            }
            
            // Extract worker name
            let wName = ''
            if (site.worker) {
                wName = site.worker.name || ''
            }

            if (result) {
                const position = new window.kakao.maps.LatLng(result.y, result.x)
                bounds.extend(position)

                newSites.push({
                    id: site.id,
                    name: site.name,
                    address: site.address,
                    lat: Number(result.y),
                    lng: Number(result.x),
                    workerName: wName,
                    startTime: site.start_time,
                    isFallback: isFallback,
                    worker_id: site.worker_id,
                    is_shared_out: site.is_shared_out,
                    shared_info: site.shared_info,
                    received_info: site.received_info,
                    rawSite: site
                })
            } else {
                // Keep the site in the list even if geocoding fails, so it doesn't disappear
                newSites.push({
                    id: site.id,
                    name: site.name,
                    address: site.address,
                    workerName: wName,
                    startTime: site.start_time,
                    worker_id: site.worker_id,
                    is_shared_out: site.is_shared_out,
                    shared_info: site.shared_info,
                    received_info: site.received_info,
                    rawSite: site
                })
            }
            // Small delay to prevent hitting the concurrent request limit
            await new Promise(r => setTimeout(r, 100))
        }

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
        markerMapRef.current.clear()

        siteList.forEach(site => {
            if (site.lat === undefined || site.lng === undefined) return;

            const position = new window.kakao.maps.LatLng(site.lat, site.lng)
            
            const timeObj = formatKoreanTime(site.startTime);
            const isPM = timeObj?.isPM;
            let markerColor = "#3b82f6"; // blue (AM / default)
            if (isPM) markerColor = "#ef4444"; // red (PM)

            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="${markerColor}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>`;
            const imageSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
            const imageSize = new window.kakao.maps.Size(48, 48);
            const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, { offset: new window.kakao.maps.Point(24, 48) });

            // SVG 기반 커스텀 핀 색상 적용
            const marker = new window.kakao.maps.Marker({
                map: map,
                position: position,
                title: site.name,
                image: markerImage
            })
            
            // 인포윈도우 (Hover 시에만 노출되도록 내용 구성)
            const timeHtml = timeObj ? `<span class="${timeObj.colorClass} font-extrabold">${timeObj.text}</span>` : null;

            const infoText = [
                site.name,
                site.workerName ? `담당: ${site.workerName}` : null,
                timeHtml ? `시간: ${timeHtml}` : null,
            ].filter(Boolean).join(' <span class="text-slate-300 mx-1">|</span> ')

            const content = `<div class="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200 text-xs font-bold text-slate-800 whitespace-nowrap -translate-y-4">${infoText}</div>`
            const customOverlay = new window.kakao.maps.CustomOverlay({
                position: position,
                content: content,
                yAnchor: 2.5,
                zIndex: 10
            })

            // 마커 마우스오버/아웃 시 커스텀오버레이 표시 (텍스트 겹침 방지)
            window.kakao.maps.event.addListener(marker, 'mouseover', () => {
                customOverlay.setMap(map)
            })
            window.kakao.maps.event.addListener(marker, 'mouseout', () => {
                customOverlay.setMap(null)
            })

            newMarkers.push(marker)
            newInfos.push(customOverlay) // keep reference to clean up on unmount
            markerMapRef.current.set(site.id, marker)
        })

        setMarkers(newMarkers)
        setInfowindows(newInfos)
    }

    // 4. 특정 주소 검색 및 거리 계산
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery || !geocoder || !map) return

        const placeSearchResult = (lat: number, lng: number) => {
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
            sites.forEach(s => {
                if (s.lat !== undefined && s.lng !== undefined) {
                    bounds.extend(new window.kakao.maps.LatLng(s.lat, s.lng))
                }
            })
            map.setBounds(bounds)

            // 선 그리기 및 거리 계산
            calculateDistances(sites.filter(s => s.lat !== undefined && s.lng !== undefined), {lat, lng})
        }

        // 1차: 주소 검색
        geocoder.addressSearch(searchQuery, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                placeSearchResult(Number(result[0].y), Number(result[0].x))
            } else {
                // 2차: 장소/키워드 검색 (아파트명, 건물명 등)
                const places = new window.kakao.maps.services.Places()
                places.keywordSearch(searchQuery, (placeResult: any, placeStatus: any) => {
                    if (placeStatus === window.kakao.maps.services.Status.OK) {
                        placeSearchResult(Number(placeResult[0].y), Number(placeResult[0].x))
                    } else {
                        alert('주소를 찾을 수 없습니다. 정확한 도로명/지번 또는 장소명을 입력해주세요.')
                    }
                })
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
                if (site.lat === undefined || site.lng === undefined) {
                    return site
                }
                const origin = { lat: centerCoords.lat, lng: centerCoords.lng }
                const destination = { lat: site.lat, lng: site.lng }
                
                // 목적지와 출발지가 동일하다면 카카오 API 호출 건너뛰기
                if (Math.abs(origin.lat - destination.lat) < 0.00001 && Math.abs(origin.lng - destination.lng) < 0.00001) {
                    return {
                        ...site,
                        distance: 0,
                        duration: 0
                    }
                }

                // swap origin and destination for Kakao Driving API request
                // Because centerCoords should be the "Destination" that other sites travel to
                const routeData = await getKakaoDrivingRoute(destination, origin)
                
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

                    // 목적지 마커 근처에 소요 시간 뱃지 오버레이 추가
                    const durationTime = Math.round(routeData.duration / 60)
                    const timeOverlay = new window.kakao.maps.CustomOverlay({
                        map: map,
                        position: new window.kakao.maps.LatLng(destination.lat, destination.lng), // Place UI badge at the starting "origin" point since the arrows travel to centerCoords
                        content: `<div class="bg-blue-600/90 text-white px-2 py-1 rounded-full shadow-md text-[11px] font-bold border border-blue-400 translate-y-6 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 11 4-7"></path><path d="m19 11-4-7"></path><path d="M2 11h20"></path><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"></path><path d="M9 11v9"></path><path d="M15 11v9"></path></svg> <span>${durationTime}분</span></div>`,
                        yAnchor: 0,
                        zIndex: 5
                    })
                    newPolylines.push(timeOverlay) // clears correctly under handleSearchClear

                    return {
                        ...site,
                        distance: routeData.distance / 1000, 
                        duration: durationTime
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
                <div className="flex flex-col md:grid md:grid-cols-4 md:h-[650px]">
                    
                    {/* Sidebar / List */}
                    <div className="md:col-span-1 border-r border-slate-200 bg-slate-50 flex flex-col md:h-full md:overflow-hidden">
                        <div className="p-4 bg-white border-b border-slate-100 flex-shrink-0">
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
                        
                        <div className="flex-1 md:overflow-y-auto p-2">
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
                                            onMouseEnter={() => {
                                                if (!map || site.lat === undefined || site.lng === undefined) return
                                                // 기존 바운스 제거
                                                if (bounceOverlayRef.current) {
                                                    bounceOverlayRef.current.setMap(null)
                                                }
                                                const pos = new window.kakao.maps.LatLng(site.lat, site.lng)
                                                const overlay = new window.kakao.maps.CustomOverlay({
                                                    position: pos,
                                                    content: `<div style="width:20px;height:20px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);animation:bounce-pin 0.5s ease infinite alternate;"></div>
                                                    <style>@keyframes bounce-pin{0%{transform:translateY(0)}100%{transform:translateY(-18px)}}</style>`,
                                                    yAnchor: 1.2,
                                                    zIndex: 100
                                                })
                                                overlay.setMap(map)
                                                bounceOverlayRef.current = overlay

                                                // 해당 마커 인포윈도우도 표시
                                                const marker = markerMapRef.current.get(site.id)
                                                if (marker) {
                                                    window.kakao.maps.event.trigger(marker, 'mouseover')
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                if (bounceOverlayRef.current) {
                                                    bounceOverlayRef.current.setMap(null)
                                                    bounceOverlayRef.current = null
                                                }
                                                // 인포윈도우 숨기기
                                                const marker = markerMapRef.current.get(site.id)
                                                if (marker) {
                                                    window.kakao.maps.event.trigger(marker, 'mouseout')
                                                }
                                            }}
                                            onClick={() => {
                                                if (map && site.lat !== undefined && site.lng !== undefined) {
                                                    const lat = site.lat
                                                    const lng = site.lng
                                                    const position = new window.kakao.maps.LatLng(lat, lng)

                                                    setSearchQuery(site.name)
                                                    
                                                    if (searchMarker) {
                                                        searchMarker.setMap(null)
                                                    }

                                                    const imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"
                                                    const imageSize = new window.kakao.maps.Size(24, 35)
                                                    const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize)
                                                    
                                                    const newSearchMarker = new window.kakao.maps.Marker({
                                                        map: map,
                                                        position: position,
                                                        image: markerImage,
                                                        title: "도착 기준 현장"
                                                    })

                                                    setSearchMarker(newSearchMarker)
                                                    setSearchLocation({lat, lng})

                                                    const bounds = new window.kakao.maps.LatLngBounds()
                                                    bounds.extend(position)
                                                    sites.forEach(s => {
                                                        if (s.lat !== undefined && s.lng !== undefined) {
                                                            bounds.extend(new window.kakao.maps.LatLng(s.lat, s.lng))
                                                        }
                                                    })
                                                    map.setBounds(bounds)

                                                    calculateDistances(sites, {lat, lng})
                                                }
                                            }}
                                        >
                                            <div className="font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                                                {site.name}
                                                {(site.lat === undefined || site.lng === undefined) ? (
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold shrink-0">지도 좌표 확인 불가</span>
                                                ) : site.isFallback && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold shrink-0">동/면 기준 위치표시</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500 truncate" title={site.address}>{site.address}</div>
                                            {(site.workerName || site.startTime) && (
                                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                                    {site.workerName && <span>담당: <span className="text-slate-700 font-medium">{site.workerName}</span></span>}
                                                    {site.startTime && (
                                                        <span>
                                                            시작: <span className={formatKoreanTime(site.startTime)?.colorClass + " font-bold"}>
                                                                {formatKoreanTime(site.startTime)?.text}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {site.duration === 0 && site.distance === 0 ? (
                                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        도착 기준 현장
                                                    </span>
                                                </div>
                                            ) : site.duration !== undefined ? (
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

                                            {/* Action buttons (팀장 변경 & 오더 공유) */}
                                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {/* 팀장 변경 버튼 */}
                                                {!site.is_shared_out ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-7 text-[11px] font-semibold px-2 flex items-center gap-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 border-slate-200">
                                                                <Users className="w-3 h-3 text-slate-500" />
                                                                팀장 변경
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 max-h-60 overflow-y-auto z-[200]">
                                                            <DropdownMenuLabel className="text-[11px]">팀장 선택</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleAssignLeader(site.id, null)} className="cursor-pointer text-[11px] font-medium text-slate-500">
                                                                (미배정)
                                                            </DropdownMenuItem>
                                                            {workers.map(w => (
                                                                <DropdownMenuItem key={w.id} onClick={() => handleAssignLeader(site.id, w.id)} className="cursor-pointer text-[11px] font-medium">
                                                                    {w.name}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                                                        공유됨 (읽기전용)
                                                    </span>
                                                )}

                                                {/* 오더 공유 버튼 */}
                                                {(!site.is_shared_out && 
                                                 (!site.shared_info || site.shared_info.status === 'cancelled' || site.shared_info.status === 'reclaimed') && 
                                                 (!site.received_info || site.received_info.status === 'cancelled' || site.received_info.status === 'reclaimed')) ? (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => setSharingSite(site)} 
                                                        className="h-7 text-[11px] font-semibold px-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                                    >
                                                        <Share2 className="w-3 h-3 text-blue-500" />
                                                        오더 공유
                                                    </Button>
                                                ) : site.shared_info && site.shared_info.status !== 'cancelled' && site.shared_info.status !== 'reclaimed' ? (
                                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                                                        공유 오더
                                                    </span>
                                                ) : null}
                                            </div>
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
                    <div className="md:col-span-3 relative h-[350px] md:h-full shrink-0">
                        {mapError ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-4 text-center">
                                <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                                <p className="font-semibold text-slate-800">{mapError}</p>
                                <p className="text-sm mt-2">페이지를 새로고침하거나 브라우저 확장앱(광고 차단기 등)을 확인해주세요.</p>
                            </div>
                        ) : (
                            <div ref={mapRef} className="w-full h-full bg-slate-100" />
                        )}
                        
                        {/* Map Center Aim */}
                        {!isLoading && !mapError && sites.length > 0 && (
                             <div className="absolute top-4 right-4 z-10">
                                <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="shadow-md font-bold"
                                    onClick={() => {
                                        if(!map) return;
                                        const bounds = new window.kakao.maps.LatLngBounds()
                                        sites.forEach(s => {
                                            if (s.lat !== undefined && s.lng !== undefined) {
                                                bounds.extend(new window.kakao.maps.LatLng(s.lat, s.lng))
                                            }
                                        })
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

            {/* 오더 공유 다이얼로그 */}
            <Dialog open={!!sharingSite} onOpenChange={(open) => { if (!open) handleCloseShareDialog(); }}>
                <DialogContent className="sm:max-w-md z-[200]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-600" />
                            파트너사 직접 오더 공유
                        </DialogTitle>
                        <DialogDescription>
                            업체명#코드명(4자리 숫자) 형식으로 파트너사를 검색하여 오더를 직접 이관(공유)할 수 있습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="flex gap-2">
                            <Input
                                placeholder="예: 클린체크#1234"
                                value={partnerCode}
                                onChange={(e) => {
                                    setPartnerCode(e.target.value)
                                    setValidatedCompany(null)
                                }}
                                disabled={isValidating || isSharing}
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleValidateCompany}
                                disabled={!partnerCode.includes('#') || isValidating || isSharing}
                            >
                                {isValidating ? '검증 중...' : '검증'}
                            </Button>
                        </div>

                        {validatedCompany && (
                            <div className="space-y-3">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900 text-sm flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">✅ 매칭 파트너사 확인</p>
                                        <p className="text-xs text-blue-700 mt-0.5">
                                            업체명: <span className="font-bold">{validatedCompany.name}</span> (#{validatedCompany.code})
                                        </p>
                                    </div>
                                    <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        매칭됨
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="share-notes" className="text-xs font-semibold text-slate-600">공유 요청사항 (선택)</Label>
                                    <Textarea
                                        id="share-notes"
                                        placeholder="파트너사에게 전달할 요청사항이나 특이사항을 적어주세요."
                                        value={shareNotes}
                                        onChange={(e) => setShareNotes(e.target.value)}
                                        rows={3}
                                        className="text-xs text-slate-800"
                                        disabled={isSharing}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 text-xs space-y-1.5 leading-relaxed">
                            <p className="font-semibold text-slate-800">📌 공유 시 통제 규칙 및 동의</p>
                            <p>• 이관 완료 시 파트너사 소속으로 새로운 현장이 생성됩니다.</p>
                            <p>• 발신사(나)의 목록에는 원래 카드가 <span className="font-bold text-orange-600">읽기 전용</span>으로 보존됩니다.</p>
                            <p>• 읽기 전용 전환 후에는 <span className="font-semibold">팀원 배정, 삭제, 수정, 채팅 참여</span>가 모두 엄격히 차단됩니다.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={handleCloseShareDialog}
                            disabled={isSharing}
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleShareSite}
                            disabled={!validatedCompany || isSharing}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSharing ? '공유 중...' : '공유 실행'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

