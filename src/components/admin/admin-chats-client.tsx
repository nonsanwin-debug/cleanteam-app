'use client'

import { useState, useMemo, useEffect } from 'react'
import { SiteChat } from '@/components/chat/site-chat'
import { PhotoUploader } from '@/components/worker/photo-uploader'
import { getSitePhotos } from '@/actions/worker'
import { Badge } from '@/components/ui/badge'
import { MapPin, MessageCircle, Search, Loader2 } from 'lucide-react'

interface AdminChatsClientProps {
    sites: any[]
    adminName: string
    adminId: string
}

export function AdminChatsClient({ sites, adminName, adminId }: AdminChatsClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedSiteId, setSelectedSiteId] = useState<string>('')
    const [photos, setPhotos] = useState<any[]>([])
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)

    // Filter sites based on search query
    const filteredSites = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) {
            // Default list: ONLY show sites currently in progress (진행중 / 작업중)
            const activeSites = sites.filter(site => site.status === 'in_progress')
            if (selectedSiteId) {
                const selectedSiteObj = sites.find(s => s.id === selectedSiteId)
                if (selectedSiteObj && selectedSiteObj.status !== 'in_progress' && !activeSites.some(s => s.id === selectedSiteId)) {
                    activeSites.unshift(selectedSiteObj)
                }
            }
            return activeSites
        }
        return sites.filter(site => {
            const nameMatch = site.name?.toLowerCase().includes(query)
            const customerMatch = site.customer_name?.toLowerCase().includes(query)
            const phoneMatch = site.customer_phone?.includes(query)
            return nameMatch || customerMatch || phoneMatch
        })
    }, [sites, searchQuery, selectedSiteId])

    // Find the currently selected site
    const selectedSite = useMemo(() => {
        if (selectedSiteId) {
            const found = sites.find(s => s.id === selectedSiteId)
            if (found) return found
        }
        return filteredSites[0] || sites[0]
    }, [sites, selectedSiteId, filteredSites])

    // Ensure selected site ID is in sync
    const currentSiteId = selectedSite?.id || ''

    // Fetch photos of the selected site dynamically
    useEffect(() => {
        if (!currentSiteId) {
            setPhotos([])
            return
        }
        
        const fetchPhotos = async () => {
            setIsLoadingPhotos(true)
            try {
                const res = await getSitePhotos(currentSiteId)
                if (res.success && res.data) {
                    setPhotos(res.data)
                } else {
                    setPhotos([])
                }
            } catch (err) {
                console.error('Failed to fetch site photos:', err)
                setPhotos([])
            } finally {
                setIsLoadingPhotos(false)
            }
        }
        fetchPhotos()
    }, [currentSiteId])

    return (
        <div className="flex flex-col gap-4 pb-10">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                    <MessageCircle className="w-7 h-7 text-indigo-600 animate-pulse" />
                    실시간 현장 채팅 관제
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    현장 사진 대장과 대화 채널을 실시간 모니터링하고 지원할 수 있습니다.
                </p>
            </div>

            {/* Real-time Search Box */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="현장명, 고객 성함 또는 연락처로 검색 (완료된 현장 포함)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white shadow-sm"
                />
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>

            {/* Carousel / Quick Selector */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-600">
                        {searchQuery ? '검색 결과' : '진행 중인 현장'} ({filteredSites.length}개)
                    </span>
                    <span className="text-[10px] text-slate-400">💡 옆으로 드래그하여 현장을 전환하세요</span>
                </div>
                {filteredSites.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-white border border-slate-200 border-dashed rounded-2xl shadow-sm">
                        {searchQuery ? '검색 결과가 없습니다.' : '현재 진행 중인 청소 현장이 없습니다.'}
                    </div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1 [&::-webkit-scrollbar]:hidden touch-pan-x snap-x snap-mandatory">
                        {filteredSites.map(site => {
                            const isSelected = currentSiteId === site.id
                            const isActiveStatus = site.status === 'in_progress'

                            return (
                                <button
                                    key={site.id}
                                    onClick={() => setSelectedSiteId(site.id)}
                                    className={`
                                        snap-start w-[180px] shrink-0 p-3 rounded-2xl border text-left flex flex-col justify-between h-[105px] transition-all relative
                                        ${isSelected
                                            ? 'bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border-indigo-500 shadow-md ring-2 ring-indigo-500/20 scale-[1.02]'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <div className="w-full space-y-1">
                                        <div className="flex items-center justify-between gap-1.5">
                                            <span className="font-extrabold text-[12px] text-slate-800 truncate block flex-1">
                                                {site.name}
                                            </span>
                                            <Badge className={`px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${
                                                site.status === 'completed'
                                                    ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                                    : isActiveStatus
                                                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                        : 'bg-slate-200 text-slate-800 hover:bg-slate-200'
                                            }`}>
                                                {site.status === 'completed' ? '완료' : isActiveStatus ? '진행중' : '대기'}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-slate-400 flex items-center truncate">
                                            <MapPin className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                                            {site.address}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 mt-1.5 w-full">
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            {site.cleaning_date ? site.cleaning_date.slice(5) : '-'} {site.start_time || ''}
                                        </span>
                                        {site.worker?.name && (
                                            <span 
                                                className="text-[10px] font-bold truncate max-w-[70px]"
                                                style={{ color: site.worker.display_color || undefined }}
                                            >
                                                👤 {site.worker.name}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Combined Main Command Control View */}
            {selectedSite ? (
                <div className="space-y-4">
                    {/* 1. Translucent Control Header (Image 2 style) */}
                    <div className="bg-[#0B1528] px-4 py-3 rounded-2xl flex items-center justify-between text-white shadow-md">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">NEXUS ADMIN CHAT CONTROL</span>
                            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                {selectedSite.name} 실시간 관제 중
                            </span>
                        </div>
                        <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full font-bold text-slate-300">
                            {adminName} (관리자)
                        </span>
                    </div>

                    {/* 2. Photo Uploader (Read-only - Image 1 top part) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                            📸 현장 사진 대장
                        </h3>
                        {isLoadingPhotos ? (
                            <div className="flex items-center justify-center py-12 text-xs text-slate-400 gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                사진 정보를 불러오는 중입니다...
                            </div>
                        ) : (
                            <PhotoUploader
                                key={`uploader-${currentSiteId}`}
                                siteId={currentSiteId}
                                existingPhotos={photos}
                                readOnly={true}
                                canDelete={false}
                                showFeatureToggle={false}
                                photoZones={selectedSite.photo_zones || []}
                            />
                        )}
                    </div>

                    {/* 3. Live Chat Panel (Image 1 bottom part) */}
                    <div className="w-full">
                        <SiteChat
                            key={`chat-${currentSiteId}`}
                            siteId={currentSiteId}
                            currentUserName={adminName}
                            currentUserRole="admin"
                            currentUserId={adminId}
                        />
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center text-slate-500 bg-white border border-slate-200/50 rounded-2xl shadow-sm">
                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700 text-base">선택된 현장이 없습니다</p>
                    <p className="text-sm text-slate-400 mt-1">상단에서 대화할 현장을 선택하거나 검색해주세요.</p>
                </div>
            )}
        </div>
    )
}
