'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { getAssignedSites, saveWorkerNotes } from '@/actions/worker'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, List, MapPin, Clock, CalendarDays, CheckCircle2, AlertCircle, Phone, Users, StickyNote } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCachedData } from '@/lib/data-cache'
import Link from 'next/link'
import { toast } from 'sonner'

import { HOLIDAYS } from '@/lib/holidays'
import { AssignedSite } from '@/types'

type ViewMode = 'calendar' | 'list'

export default function WorkerSchedulePage() {
    const [viewMode, setViewMode] = useState<ViewMode>('calendar')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(new Date())

    const [selectedSite, setSelectedSite] = useState<AssignedSite | null>(null)
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    // 같은 캐시 키 'worker-sites'를 공유 → 홈에서 이미 로드한 데이터 즉시 사용!
    const { data: sites, loading, refresh: loadData } = useCachedData<AssignedSite[]>(
        'worker-sites',
        getAssignedSites,
        { staleTime: 15_000 }
    )

    // Current UserId Load
    useEffect(() => {
        const supabaseClient = createClient()
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id)
        })
    }, [])

    // PWA 복귀 시 자동 갱신
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadData()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [loadData])

    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    // Generate calendar days
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const weekDays = ['일', '월', '화', '수', '목', '금', '토']

    const allSites = sites || []

    // 날짜별로 작업 그룹화하기 (Selected Date용)
    const selectedDateSites = useMemo(() => {
        return allSites.filter(site => {
            const siteDateStr = site.cleaning_date || site.created_at
            return isSameDay(new Date(siteDateStr), selectedDate)
        })
    }, [allSites, selectedDate])

    // 전체 다가오는 일정 목록 (List View용)
    const upcomingSites = useMemo(() => {
        return [...allSites].sort((a, b) => {
            const dateA = new Date(a.cleaning_date || a.created_at).getTime()
            const dateB = new Date(b.cleaning_date || b.created_at).getTime()
            return dateB - dateA // 최신순으로 정렬 (내림차순)
        })
    }, [allSites])


    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-4 pb-20">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold flex items-center">
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    일정 관리
                </h2>

                {/* View Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center",
                            viewMode === 'calendar' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <CalendarIcon className="w-4 h-4 mr-1.5" />
                        달력
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center",
                            viewMode === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <List className="w-4 h-4 mr-1.5" />
                        목록
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <>
                    {/* Calendar View Area */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-slate-100 mb-4">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 text-slate-500 hover:text-slate-900">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="font-bold text-lg text-slate-800 tracking-tight">
                            {format(currentDate, 'yyyy년 M월', { locale: ko })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 text-slate-500 hover:text-slate-900">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    <Card className="border-none shadow-md overflow-hidden rounded-xl bg-white">
                        <CardContent className="p-0">
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 border-b bg-slate-50/80">
                                {weekDays.map((day, i) => (
                                    <div key={day} className={cn(
                                        "py-2.5 text-center text-[13px] font-bold text-slate-600",
                                        i === 0 && "text-red-500",
                                        i === 6 && "text-blue-500"
                                    )}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-[1px]">
                                {calendarDays.map((day) => {
                                    const dateKey = format(day, 'yyyy-MM-dd')
                                    const holidayName = HOLIDAYS[dateKey]
                                    const isHoliday = !!holidayName
                                    const isSunday = day.getDay() === 0
                                    const isSaturday = day.getDay() === 6
                                    const isSelected = isSameDay(day, selectedDate)

                                    // Filter sites for this day
                                    const daySites = allSites.filter(site => {
                                        const siteDateStr = site.cleaning_date || site.created_at
                                        return isSameDay(new Date(siteDateStr), day)
                                    })

                                    return (
                                        <div
                                            key={day.toString()}
                                            onClick={() => setSelectedDate(day)}
                                            className={cn(
                                                "bg-white p-1 pb-2 min-h-[70px] flex flex-col items-center relative transition-colors cursor-pointer group",
                                                !isSameMonth(day, monthStart) && "bg-slate-50/50 opacity-50",
                                                isSelected && "bg-blue-50/50 ring-inset ring-2 ring-primary rounded"
                                            )}
                                        >
                                            <div className="flex flex-col items-center w-full mt-1">
                                                <span className={cn(
                                                    "text-[15px] font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                                                    isToday(day) && "bg-slate-900 text-white shadow-sm",
                                                    !isToday(day) && (isSunday || isHoliday) && "text-red-500",
                                                    !isToday(day) && !isHoliday && isSaturday && "text-blue-500",
                                                    isSelected && !isToday(day) && "bg-blue-100 text-blue-700 font-bold"
                                                )}>
                                                    {format(day, 'd')}
                                                </span>
                                                {holidayName && (
                                                    <span className="text-[9px] text-red-500 font-medium truncate w-[90%] text-center mt-0.5 opacity-80">
                                                        {holidayName}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Dot Indicators */}
                                            {daySites.length > 0 && (
                                                <div className="flex gap-1 mt-auto pb-1 pt-2 justify-center flex-wrap px-1">
                                                    {daySites.slice(0, 3).map((site) => (
                                                        <span
                                                            key={site.id}
                                                            className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                site.status === 'completed' ? "bg-emerald-500" :
                                                                    site.status === 'in_progress' ? "bg-orange-500" : "bg-red-500"
                                                            )}
                                                        />
                                                    ))}
                                                    {daySites.length > 3 && (
                                                        <span className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selected Date Details Area */}
                    <div className="mt-6 animation-fade-in">
                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                                {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
                            </span>
                            의 일정
                        </h3>

                        {selectedDateSites.length === 0 ? (
                            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400">
                                <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">선택하신 날짜에 배정된 일정이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDateSites.map(site => (
                                    <JobCard
                                        key={site.id}
                                        site={site}
                                        currentUserId={currentUserId}
                                        onNoteSaved={loadData}
                                        onRequestPoints={() => {
                                            setSelectedSite(site)
                                            setIsClaimModalOpen(true)
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* List View Area */
                <div className="space-y-4 pt-2">
                    {upcomingSites.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-slate-400">
                            <CheckCircle2 className="w-12 h-12 mb-3 opacity-30 text-emerald-500" />
                            <p className="text-sm font-medium">배정된 일정이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingSites.map((site, index) => {
                                // Add month/date headers dynamically for list view
                                const currentSiteDate = new Date(site.cleaning_date || site.created_at)
                                const prevSiteDate = index > 0 ? new Date(upcomingSites[index - 1].cleaning_date || upcomingSites[index - 1].created_at) : null

                                const showDateHeader = !prevSiteDate || !isSameDay(currentSiteDate, prevSiteDate)

                                return (
                                    <div key={site.id} className="space-y-2">
                                        {showDateHeader && (
                                            <div className="sticky top-14 z-10 bg-[#f8fafc]/90 backdrop-blur-sm py-2">
                                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                    <div className="w-1 h-3.5 bg-primary rounded-full" />
                                                    {format(currentSiteDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
                                                </h3>
                                            </div>
                                        )}
                                        <JobCard
                                            site={site}
                                            currentUserId={currentUserId}
                                            onNoteSaved={loadData}
                                            onRequestPoints={() => {
                                                setSelectedSite(site)
                                                setIsClaimModalOpen(true)
                                            }}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Point Claim Modal */}
            {isClaimModalOpen && (
                <ClaimModal
                    site={selectedSite!}
                    isOpen={isClaimModalOpen}
                    onClose={() => setIsClaimModalOpen(false)}
                    onSuccess={() => {
                        setIsClaimModalOpen(false)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}

// Reusable Job Card Component for Details and List View (Modeled after home SiteCard)
function JobCard({ site, currentUserId, onNoteSaved, onRequestPoints }: { site: AssignedSite, currentUserId: string | null, onNoteSaved: () => void, onRequestPoints: () => void }) {
    const isLeader = !!(currentUserId && site.worker_id === currentUserId)

    // 오전/오후 판별
    const getTimeLabel = () => {
        if (!site.start_time) return null
        const hourMatch = site.start_time.match(/(\d{1,2})/)
        if (!hourMatch) return null
        const hour = parseInt(hourMatch[1], 10)
        if (hour < 12) return { label: '오전', color: 'bg-amber-500 text-white', time: site.start_time }
        return { label: '오후', color: 'bg-indigo-500 text-white', time: site.start_time }
    }
    const timeLabel = getTimeLabel()

    const [hcLoading, setHcLoading] = useState(false)

    const handleHappyCall = async () => {
        if (!confirm('해피콜을 완료 처리하시겠습니까?')) return
        setHcLoading(true)
        try {
            const { completeHappyCall } = await import('@/actions/worker')
            const res = await completeHappyCall(site.id)
            if (res.success) {
                toast.success('해피콜 처리가 완료되었습니다.')
                onNoteSaved() // Refresh lists
            } else {
                toast.error(res.error || '해피콜 처리 실패')
            }
        } catch {
            toast.error('오류가 발생했습니다.')
        } finally {
            setHcLoading(false)
        }
    }

    return (
        <Card className={cn(
            "border-l-4 shadow-sm hover:shadow-md transition-shadow",
            site.status === 'in_progress' ? 'border-l-orange-500' : site.status === 'completed' ? 'border-l-emerald-500 opacity-80' : 'border-l-red-500'
        )}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <Badge variant={site.status === 'in_progress' ? 'default' : site.status === 'completed' ? 'secondary' : 'outline'}>
                            {site.status === 'in_progress' ? '진행 중' : site.status === 'completed' ? '완료됨' : '대기 중'}
                        </Badge>
                        {timeLabel && (
                            <span className={`${timeLabel.color} text-xs font-bold px-2.5 py-1 rounded-full shadow-sm`}>
                                {timeLabel.label} {timeLabel.time}
                            </span>
                        )}
                    </div>
                </div>
                <CardTitle className="text-xl mt-2">{site.name}</CardTitle>
                <div className="mt-2 space-y-1">
                    {site.customer_name && (
                        <p className="text-sm text-slate-600">고객: <span className="font-semibold text-slate-900">{site.customer_name}</span></p>
                    )}
                    {isLeader && site.members && site.members.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Users className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs text-slate-500">팀원:</span>
                            {site.members.map((m) => (
                                <span key={m.user_id} className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    {m.name}
                                </span>
                            ))}
                        </div>
                    )}
                    {isLeader && (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            {site.customer_phone ? (
                                site.customer_phone.split('/').map((phone, idx) => {
                                    const trimmed = phone.trim()
                                    return (
                                        <a key={idx} href={`tel:${trimmed}`} className="flex items-center text-blue-600 font-bold text-base bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 mt-1">
                                            <Phone className="h-4 w-4 mr-2" />
                                            <span>{trimmed}</span>
                                            <span className="ml-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">전화하기</span>
                                        </a>
                                    )
                                })
                            ) : (
                                <span className="text-slate-400 text-xs italic bg-slate-100 px-2 py-1 rounded mt-1">연락처 미등록</span>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pb-2 text-sm text-slate-600 space-y-3">
                <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 text-slate-400 mt-0.5 shrink-0" />
                    <span className="break-keep">{site.address}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded">
                    <div>
                        <span className="text-slate-400 block">평수</span>
                        <span>{site.area_size || '-'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block">구조</span>
                        <span>{site.structure_type || '-'}</span>
                    </div>
                    {site.special_notes && (
                        <div className="col-span-2 mt-1">
                            <div className="relative overflow-hidden rounded-lg border-2 border-red-400 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 p-2.5 animate-pulse">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-red-500 text-xs font-bold tracking-wider animate-bounce" style={{ animationDuration: '2s' }}>⚠️ 특이사항</span>
                                </div>
                                <span className="text-red-600 font-bold text-sm block" style={{
                                    textShadow: '0 0 8px rgba(239, 68, 68, 0.3)'
                                }}>{site.special_notes}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 현장 메모 (팀장 편집 / 팀원 읽기) */}
                <MemoSection site={site} isLeader={isLeader} onSaved={onNoteSaved} />

                {/* 해피콜 완료 섹션 */}
                {isLeader && (
                    <div className="mt-3">
                        {site.happy_call_completed ? (
                            <div className="flex justify-center items-center py-2 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-700 text-sm font-bold w-full">
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                해피콜 완료
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50 h-9 text-xs"
                                onClick={handleHappyCall}
                                disabled={hcLoading}
                            >
                                {hcLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                ) : (
                                    <Phone className="h-4 w-4 mr-1.5" />
                                )}
                                해피콜 진행 확인
                            </Button>
                        )}
                    </div>
                )}

                {site.status !== 'completed' && (
                    <div className="mt-2">
                        <a
                            href={`tmap://search?name=${encodeURIComponent(site.address)}`}
                            className="w-full"
                        >
                            <Button size="sm" variant="outline" className="w-full h-9 text-xs border-green-500 bg-green-50 hover:bg-green-100 text-slate-900">
                                티맵
                            </Button>
                        </a>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                {site.status === 'completed' ? (
                    <div className="flex-1 w-full space-y-2">
                        {site.payment_status === 'paid' ? (
                            <div className="text-sm text-emerald-600 font-bold bg-emerald-50 py-2 rounded-lg text-center w-full flex items-center justify-center gap-1.5 border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" /> 포인트 지급 완료
                            </div>
                        ) : site.payment_status === 'requested' ? (
                            <div className="flex items-center justify-between w-full bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                                <span className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4" /> 포인트 청구됨
                                </span>
                                {site.claimed_amount && (
                                    <span className="text-sm text-slate-700 font-bold">
                                        {site.claimed_amount.toLocaleString()}포인트
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 w-full">
                                <Button
                                    onClick={onRequestPoints}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-base font-bold h-11"
                                >
                                    포인트 요청하기
                                </Button>
                                <Link href={`/worker/sites/${site.id}`} className="w-full">
                                    <Button variant="outline" className="w-full h-11 font-medium text-slate-600 border-slate-300">
                                        현장 기록 보기
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href={`/worker/sites/${site.id}`} className="w-full">
                        <Button variant="secondary" className="w-full font-bold">
                            현장 상세 및 작업 시작
                        </Button>
                    </Link>
                )}
            </CardFooter>
        </Card>
    )
}

// 메모 섹션 컴포넌트
function MemoSection({ site, isLeader, onSaved }: { site: AssignedSite, isLeader: boolean, onSaved?: () => void }) {
    const [editing, setEditing] = useState(false)
    const [noteText, setNoteText] = useState(site.worker_notes || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await saveWorkerNotes(site.id, noteText)
            if (result.success) {
                toast.success('메모가 저장되었습니다.')
                setEditing(false)
                onSaved?.()
            } else {
                toast.error(result.error || '저장 실패')
            }
        } catch {
            toast.error('메모 저장 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // 팀원: 메모가 있을 때만 표시 (읽기 전용)
    if (!isLeader) {
        if (!site.worker_notes) return null
        return (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                    <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-blue-600 text-xs font-bold">팀장 메모</span>
                </div>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{site.worker_notes}</p>
            </div>
        )
    }

    // 팀장: 편집 모드
    if (editing) {
        return (
            <div className="mt-2 bg-blue-50 border border-blue-300 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-blue-600 text-xs font-bold">현장 메모</span>
                </div>
                <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="주차: B2, 열쇠 경비실, 비밀번호 1234# ..."
                    className="w-full text-sm border border-blue-200 rounded-md p-2 min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                />
                <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : '저장'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setNoteText(site.worker_notes || '') }}>
                        취소
                    </Button>
                </div>
            </div>
        )
    }

    // 팀장: 읽기 모드 (클릭하면 편집)
    return (
        <div
            className={`mt-2 rounded-lg p-2.5 cursor-pointer transition-colors ${site.worker_notes
                ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                : 'bg-slate-50 border border-dashed border-slate-300 hover:bg-slate-100'
                }`}
            onClick={() => setEditing(true)}
        >
            <div className="flex items-center gap-1.5">
                <StickyNote className={`h-3.5 w-3.5 ${site.worker_notes ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${site.worker_notes ? 'text-blue-600' : 'text-slate-400'}`}>
                    {site.worker_notes ? '현장 메모' : '메모 추가'}
                </span>
                <span className="text-slate-400 text-[10px]">탭하여 편집</span>
            </div>
            {site.worker_notes && (
                <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">{site.worker_notes}</p>
            )}
        </div>
    )
}

function ClaimModal({ site, isOpen, onClose, onSuccess }: { site: AssignedSite, isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
    const [items, setItems] = useState<{ name: string; amount: string }[]>([{ name: '', amount: '' }])
    const [photos, setPhotos] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const totalAmount = items.reduce((sum, item) => {
        const amt = parseInt(item.amount.replace(/,/g, ''), 10) || 0
        return sum + amt
    }, 0)

    const handleAddItem = () => setItems([...items, { name: '', amount: '' }])
    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index))

    const handleItemChange = (index: number, field: 'name' | 'amount', value: string) => {
        const newItems = [...items]
        newItems[index][field] = value
        setItems(newItems)
    }

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)
        try {
            const { uploadClaimPhoto } = await import('@/actions/worker')
            const { compressImage } = await import('@/lib/utils/image-compression')

            for (let i = 0; i < files.length; i++) {
                const compressed = await compressImage(files[i])
                const formData = new FormData()
                formData.append('file', compressed)
                formData.append('siteId', site.id)

                const result = await uploadClaimPhoto(formData)
                if (result.success && result.data?.publicUrl) {
                    setPhotos(prev => [...prev, result.data!.publicUrl])
                }
            }
        } catch (err) {
            alert('사진 업로드 실패')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function handleSubmit() {
        if (totalAmount <= 0) {
            alert('청구 금액을 입력해주세요.')
            return
        }

        setSubmitting(true)
        try {
            const { requestPayment } = await import('@/actions/worker')

            // Clean up items (remove empty ones)
            const validItems = items.filter(i => i.name.trim() !== '' && i.amount.trim() !== '')

            const result = await requestPayment(site.id, totalAmount, validItems, photos)

            if (result.success) {
                alert('포인트 요청이 완료되었습니다.')
                onSuccess()
            } else {
                alert(result.error)
            }
        } catch (e) {
            alert('오류가 발생했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl">
                <CardContent className="p-6 space-y-5">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">포인트 요청</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            <span className="font-semibold text-slate-700">{site.name}</span> 작업의<br />
                            상세 청구 내역을 입력해주세요.
                        </p>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-slate-700">청구 항목</label>
                            <Button variant="outline" size="sm" onClick={handleAddItem} className="h-7 text-xs bg-white">
                                + 항목 추가
                            </Button>
                        </div>

                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input
                                    className="flex-1 h-10 rounded-lg border-slate-200 border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                                    placeholder="항목명 (예: 식대, 주차비)"
                                    value={item.name}
                                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                />
                                <input
                                    type="number"
                                    className="w-24 h-10 rounded-lg border-slate-200 border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white text-right"
                                    placeholder="금액"
                                    value={item.amount}
                                    onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                                />
                                {items.length > 1 && (
                                    <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}

                        <div className="flex justify-end text-base font-bold text-primary border-t border-slate-200 pt-3 mt-2">
                            합계: {totalAmount.toLocaleString()}포인트
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">영수증/증빙 사진</label>
                        <div className="flex flex-wrap gap-2">
                            {photos.map((url, idx) => (
                                <div key={idx} className="relative w-20 h-20 rounded-lg border border-slate-200 overflow-hidden shadow-sm group">
                                    <img src={url} alt="receipt" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                                            className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                        >✕</button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                                disabled={uploading}
                            >
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin mb-1 text-primary" /> : <div className="text-2xl mb-1">+</div>}
                                <span className="text-[10px] font-medium">{uploading ? '업로드중' : '사진 추가'}</span>
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handlePhotoUpload}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <Button variant="outline" className="flex-1 h-12 text-base font-semibold" onClick={onClose}>
                            취소
                        </Button>
                        <Button className="flex-1 h-12 text-base font-bold shadow-md" onClick={handleSubmit} disabled={submitting || uploading}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            청구하기
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
