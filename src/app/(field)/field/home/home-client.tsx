'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, CalendarDays, MapPin, Building2, User, Camera, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FeedSite } from '@/actions/partner-feed'

export function FieldHomeClient({ 
    partnerName, 
    feedSites 
}: { 
    partnerName: string
    feedSites: FeedSite[]
}) {
    const router = useRouter()
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel('partner-home-refresh')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sites' },
                () => { router.refresh() }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router])

    const handleImageError = (url: string) => {
        setImageErrors(prev => new Set(prev).add(url))
    }

    const ongoingCount = feedSites.filter(s => s.status !== 'completed').length

    return (
        <div className="p-4 space-y-6">
            
            {/* 1. Header Area */}
            <div className="pt-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-800 leading-tight">
                    반가워요, <br />
                    <span className="text-teal-600">{partnerName}</span> 대표님!
                </h1>
                <p className="text-base text-slate-500 mt-2 flex items-center gap-1.5">
                    현재 <strong className="text-teal-600 text-lg">{ongoingCount}</strong>건의 청소가 진행 중입니다.
                </p>
            </div>

            {/* 2. Big Action Button (Booking) */}
            <div className="pt-2">
                <button 
                    onClick={() => router.push('/field/book')}
                    className="w-full relative overflow-hidden bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-all text-white rounded-2xl shadow-lg border border-teal-500/20 group"
                >
                    <div className="p-8 flex flex-col items-center justify-center gap-3 relative z-10">
                        <div className="bg-white/20 p-3 rounded-full group-active:scale-95 transition-transform shrink-0">
                            <PlusCircle className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-center space-y-1">
                            <span className="text-2xl font-extrabold tracking-tight">신규 예약하기</span>
                            <p className="text-teal-50 text-sm font-medium opacity-90">10초 만에 간편하게 접수하세요</p>
                        </div>
                    </div>
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-black/5 rounded-full blur-xl pointer-events-none"></div>
                </button>
            </div>

            {/* 3. NEXUS 진행 내역 */}
            <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-slate-400" />
                        NEXUS 진행 내역
                    </h2>
                    <span className="text-xs text-slate-400 font-medium">전체 {feedSites.length}건</span>
                </div>

                {feedSites.length === 0 ? (
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="p-6 text-center">
                            <p className="text-slate-500 font-medium">등록된 현장이 없습니다.</p>
                            <p className="text-sm text-slate-400 mt-1">상단의 버튼을 눌러 예약을 시작해보세요.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {feedSites.map(site => {
                            let statusText = '대기'
                            let statusColor = 'bg-blue-100 text-blue-700'
                            
                            if (site.status === 'completed') {
                                statusText = '작업 완료'
                                statusColor = 'bg-emerald-100 text-emerald-700'
                            } else if (site.status === 'in_progress') {
                                statusText = '진행중'
                                statusColor = 'bg-orange-100 text-orange-700'
                            }

                            const hasPhotos = site.before_photos.length > 0 || site.after_photos.length > 0
                            
                            return (
                                <Card 
                                    key={site.id} 
                                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
                                    onClick={() => router.push(`/share/${site.id}`)}
                                >
                                    <CardContent className="p-4 space-y-3">
                                        {/* 주소 + 상태 */}
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-800 pr-2 max-w-[75%] line-clamp-2 leading-snug">
                                                {site.address}
                                            </span>
                                            <Badge className={`font-medium shadow-none shrink-0 ${statusColor}`}>
                                                {statusText}
                                            </Badge>
                                        </div>

                                        {/* 날짜 / 평수 */}
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                                {site.cleaning_date || '날짜 미정'}
                                            </span>
                                            {site.start_time && (
                                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {site.start_time}
                                                </span>
                                            )}
                                            {site.area_size && (
                                                <span className="text-slate-600 font-medium">{site.area_size}</span>
                                            )}
                                        </div>

                                        {/* 작업 전/후 사진 (완료 현장만) */}
                                        {site.status === 'completed' && hasPhotos && (
                                            <div className="pt-2 border-t border-slate-100 space-y-3">
                                                {/* Before Photos */}
                                                {site.before_photos.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <Camera className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="text-xs font-bold text-blue-700">작업 전</span>
                                                        </div>
                                                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                                            {site.before_photos.map((url, i) => (
                                                                !imageErrors.has(url) && (
                                                                    <img
                                                                        key={`before-${i}`}
                                                                        src={url}
                                                                        alt={`작업 전 ${i + 1}`}
                                                                        className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0"
                                                                        onError={() => handleImageError(url)}
                                                                    />
                                                                )
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* After Photos */}
                                                {site.after_photos.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <Camera className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span className="text-xs font-bold text-emerald-700">작업 후</span>
                                                        </div>
                                                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                                            {site.after_photos.map((url, i) => (
                                                                !imageErrors.has(url) && (
                                                                    <img
                                                                        key={`after-${i}`}
                                                                        src={url}
                                                                        alt={`작업 후 ${i + 1}`}
                                                                        className="w-24 h-24 object-cover rounded-lg border border-emerald-200 shadow-sm shrink-0"
                                                                        onError={() => handleImageError(url)}
                                                                    />
                                                                )
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Spacer for bottom nav */}
            <div className="h-6"></div>
        </div>
    )
}
