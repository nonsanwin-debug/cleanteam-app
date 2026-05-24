'use client'

import { useState, useMemo } from 'react'
import { SiteChat } from '@/components/chat/site-chat'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, User, Calendar, Phone, ExternalLink, MessageCircle, Info } from 'lucide-react'
import Link from 'next/link'

interface AdminChatsClientProps {
    sites: any[]
    adminName: string
    adminId: string
}

export function AdminChatsClient({ sites, adminName, adminId }: AdminChatsClientProps) {
    const [selectedTab, setSelectedTab] = useState<'all' | 'in_progress' | 'completed'>('in_progress')
    const [selectedSiteId, setSelectedSiteId] = useState<string>('')

    // Filter sites by status
    const filteredSites = useMemo(() => {
        return sites.filter(site => {
            if (selectedTab === 'all') return true
            if (selectedTab === 'in_progress') return site.status === 'in_progress' || site.status === 'pending'
            if (selectedTab === 'completed') return site.status === 'completed'
            return true
        })
    }, [sites, selectedTab])

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

    return (
        <div className="flex flex-col gap-4 pb-10">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                    <MessageCircle className="w-7 h-7 text-indigo-600 animate-pulse" />
                    실시간 현장 채팅 관제
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    전체 청소 현장의 실시간 대화를 모니터링하고 원격 지원 및 직접 참여할 수 있습니다.
                </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-200/60 border border-slate-200/40 rounded-xl max-w-sm">
                {[
                    { value: 'all' as const, label: '전체' },
                    { value: 'in_progress' as const, label: '진행 중' },
                    { value: 'completed' as const, label: '완료됨' }
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => {
                            setSelectedTab(tab.value)
                            setSelectedSiteId('') // Reset to select the first filtered site
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedTab === tab.value
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Carousel / Quick Selector */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-600">현장 선택 ({filteredSites.length}개)</span>
                    <span className="text-[10px] text-slate-400">💡 옆으로 드래그하여 현장을 전환하세요</span>
                </div>
                {filteredSites.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-white border border-slate-200 border-dashed rounded-2xl shadow-sm">
                        해당 상태의 활성화된 현장이 없습니다.
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

            {/* Main Selector Chat Panel */}
            {selectedSite ? (
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 items-start">
                    {/* Chat Panel - Renders FIRST on mobile using flex order-1 */}
                    <div className="w-full lg:col-span-2 order-1 lg:order-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[540px]">
                        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white shrink-0">
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NEXUS ADMIN CHAT CONTROL</span>
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
                        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
                            <SiteChat
                                key={currentSiteId}
                                siteId={currentSiteId}
                                currentUserName={adminName}
                                currentUserRole="admin"
                                currentUserId={adminId}
                            />
                        </div>
                    </div>

                    {/* Selected Site details banner - Renders SECOND on mobile using flex order-2 */}
                    <div className="w-full lg:col-span-1 order-2 lg:order-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                                    {selectedSite.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 flex items-center leading-relaxed">
                                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                                    {selectedSite.address}
                                </p>
                            </div>
                            <Link href={`/admin/sites/${selectedSite.id}`} target="_blank">
                                <Button variant="outline" size="sm" className="h-8 px-2 text-xs font-bold gap-1 shrink-0">
                                    상세 정보 <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs border-t pt-4 border-slate-100">
                            <div>
                                <span className="text-slate-400 block mb-0.5">👤 담당 팀장</span>
                                <div className="font-bold flex items-center">
                                    <span style={{ color: selectedSite.worker?.display_color || undefined }}>
                                        {selectedSite.worker?.name || '미지정'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">📞 고객 연락처</span>
                                <div className="font-bold">{selectedSite.customer_phone || '-'}</div>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">📅 작업 일시</span>
                                <div className="font-bold text-slate-700">
                                    {selectedSite.cleaning_date || '-'} {selectedSite.start_time || ''}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">🏷️ 주거/평수</span>
                                <div className="font-bold text-slate-700">
                                    {selectedSite.residential_type || '-'} · {selectedSite.area_size || '-'}
                                </div>
                            </div>
                        </div>

                        {selectedSite.special_notes && (
                            <div className="bg-yellow-50/80 border border-yellow-100 p-3 rounded-xl text-xs space-y-1">
                                <span className="font-bold text-yellow-800 block">⚠️ 현장 특이사항</span>
                                <span className="text-yellow-700 block whitespace-pre-wrap">{selectedSite.special_notes}</span>
                            </div>
                        )}
                        
                        {selectedSite.worker_notes && (
                            <div className="bg-blue-50/80 border border-blue-100 p-3 rounded-xl text-xs space-y-1">
                                <span className="font-bold text-blue-800 block">📝 팀장 메모</span>
                                <span className="text-blue-700 block whitespace-pre-wrap">{selectedSite.worker_notes}</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center text-slate-500 bg-white border border-slate-200/50 rounded-2xl shadow-sm">
                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700 text-base">선택된 현장이 없습니다</p>
                    <p className="text-sm text-slate-400 mt-1">상단에서 대화할 현장을 선택해주세요.</p>
                </div>
            )}
        </div>
    )
}
