'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Clock, User, ArrowRight, Loader2 } from 'lucide-react'
import { format, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getAdminDailySiteCounts, getAdminSitesByDate } from '@/actions/admin-schedule'
import Link from 'next/link'

export function AdminScheduleCalendar({ initialDate }: { initialDate: Date }) {
    const [currentDate, setCurrentDate] = useState(initialDate)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // default to today
    const [isPending, startTransition] = useTransition()
    
    const [monthlyCounts, setMonthlyCounts] = useState<Record<string, number>>({})
    const [selectedSites, setSelectedSites] = useState<any[]>([])
    const [isLoadingSites, setIsLoadingSites] = useState(false)

    // Generate Calendar Grid
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate })

    // Fetch counts when month changes
    useEffect(() => {
        const fetchCounts = async () => {
            const startStr = format(startDate, 'yyyy-MM-dd')
            const endStr = format(endDate, 'yyyy-MM-dd')
            const counts = await getAdminDailySiteCounts(startStr, endStr)
            setMonthlyCounts(counts)
        }
        fetchCounts()
    }, [currentDate])

    // Fetch sites when selected date changes
    useEffect(() => {
        const fetchSites = async () => {
            setIsLoadingSites(true)
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            try {
                const sites = await getAdminSitesByDate(dateStr)
                setSelectedSites(sites)
            } catch (err) {
                console.error(err)
            } finally {
                setIsLoadingSites(false)
            }
        }
        fetchSites()
    }, [selectedDate])

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <Card className="lg:col-span-2 shadow-sm order-2 lg:order-1 border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 border-b border-slate-100 rounded-t-xl">
                    <CardTitle className="text-xl flex items-center gap-2 font-extrabold text-slate-800">
                        <CalendarDays className="h-6 w-6 text-indigo-600" />
                        {format(currentDate, 'yyyy년 M월', { locale: ko })}
                    </CardTitle>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth} className="hover:bg-indigo-50 hover:text-indigo-600 border-slate-200">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                            setCurrentDate(new Date())
                            setSelectedDate(new Date())
                        }} className="font-bold border-slate-200">
                            오늘
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleNextMonth} className="hover:bg-indigo-50 hover:text-indigo-600 border-slate-200">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-7 gap-2 text-center font-bold text-slate-500 mb-3">
                        <div className="py-2 text-xs text-rose-500">일</div>
                        <div className="py-2 text-xs">월</div>
                        <div className="py-2 text-xs">화</div>
                        <div className="py-2 text-xs">수</div>
                        <div className="py-2 text-xs">목</div>
                        <div className="py-2 text-xs">금</div>
                        <div className="py-2 text-xs text-blue-500">토</div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {dateRange.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const isCurrentMonth = isSameMonth(day, currentDate)
                            const isSelected = isSameDay(day, selectedDate)
                            const isToday = isSameDay(day, new Date())
                            const count = monthlyCounts[dateStr] || 0

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        min-h-[90px] p-2 flex flex-col items-center justify-start border rounded-xl transition-all
                                        ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400 opacity-60' : 'bg-white hover:bg-slate-50 hover:border-slate-300'}
                                        ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10' : 'border-slate-200 shadow-sm'}
                                    `}
                                >
                                    <div className="w-full flex justify-center items-center mb-2 mt-1">
                                        <span className={`
                                            inline-flex items-center justify-center w-7 h-7 text-[13px] rounded-full
                                            ${isToday ? 'bg-indigo-600 text-white font-extrabold shadow-md' : 'font-semibold'}
                                            ${!isToday && day.getDay() === 0 ? 'text-rose-500' : ''}
                                            ${!isToday && day.getDay() === 6 ? 'text-blue-500' : ''}
                                            ${!isToday && !isCurrentMonth ? 'text-slate-400' : ''}
                                            ${isSelected && !isToday ? 'text-indigo-700 bg-indigo-100' : ''}
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                    
                                    {count > 0 && (
                                        <div className="mt-auto w-full px-1">
                                            <div className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold py-1 px-1.5 rounded-lg w-full flex items-center justify-center">
                                                총 {count}건
                                            </div>
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Daily Schedule Panel */}
            <Card className="shadow-sm order-1 lg:order-2 self-start sticky top-6 border-slate-200 flex flex-col h-[calc(100vh-2rem)] max-h-[850px]">
                <CardHeader className="pb-4 border-b bg-indigo-600 text-white rounded-t-xl shrink-0">
                    <CardTitle className="text-xl flex items-center justify-between">
                        <span>{format(selectedDate, 'M월 d일', { locale: ko })} 스케줄</span>
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none font-bold">
                            {selectedSites.length}건
                        </Badge>
                    </CardTitle>
                    <CardDescription className="text-indigo-100">
                        해당 일자에 등록된 현장 목록입니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex-1 overflow-y-auto bg-slate-50/50 px-4">
                    {isLoadingSites ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                            <p className="font-medium text-sm">일정을 불러오는 중입니다...</p>
                        </div>
                    ) : selectedSites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center space-y-2">
                            <CalendarDays className="w-12 h-12 mb-2 text-slate-300" />
                            <span className="font-bold text-slate-600">등록된 현장이 없습니다</span>
                            <span className="text-xs text-slate-500">다른 일자를 선택해보세요.</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedSites.map(site => (
                                <Link key={site.id} href={`/admin/sites/${site.id}`} className="block group">
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5 text-slate-800 font-bold overflow-hidden">
                                                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                                                <span className="truncate">{site.name}</span>
                                            </div>
                                            <Badge className={
                                                site.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                                                site.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }>
                                                {site.status === 'completed' ? '작업 완료' : site.status === 'in_progress' ? '진행 중' : '대기 중'}
                                            </Badge>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            {site.start_time && (
                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{site.start_time}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="font-medium text-slate-700">
                                                    {site.worker ? site.worker.name : '미배정'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3 pt-3 border-t flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[11px] font-bold text-indigo-600">상세 보기</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
