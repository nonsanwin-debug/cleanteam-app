'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { KOREAN_HOLIDAYS } from '@/lib/korean-holidays'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function getMonday(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + diff)
    date.setHours(0, 0, 0, 0)
    return date
}

function formatDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
}

export function AdminSiteDateFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dateParam = searchParams.get('date') || ''

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const selectedDate = dateParam ? new Date(dateParam + 'T00:00:00') : today

    const [weekStart, setWeekStart] = useState(() => getMonday(selectedDate))

    const weekDays = useMemo(() => {
        const days: Date[] = []
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart)
            d.setDate(weekStart.getDate() + i)
            days.push(d)
        }
        return days
    }, [weekStart])

    const monthYearLabel = useMemo(() => {
        const mid = new Date(weekStart)
        mid.setDate(weekStart.getDate() + 3)
        return `${mid.getFullYear()}년 ${mid.getMonth() + 1}월`
    }, [weekStart])

    const selectedDayLabel = useMemo(() => {
        const dayIndex = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1
        const dateStr = formatDate(selectedDate)
        const holiday = KOREAN_HOLIDAYS[dateStr]
        let label = `${selectedDate.getFullYear()}년 ${String(selectedDate.getMonth() + 1).padStart(2, '0')}월 ${String(selectedDate.getDate()).padStart(2, '0')}일 (${DAY_LABELS[dayIndex]})`
        if (holiday) label += ` · ${holiday}`
        return label
    }, [selectedDate])

    const handleSelectDate = (date: Date) => {
        const formatted = formatDate(date)
        const params = new URLSearchParams(searchParams.toString())
        params.set('date', formatted)
        const query = params.toString()
        router.push(`/admin/sites${query ? `?${query}` : ''}`)
    }

    const prevWeek = () => {
        const newStart = new Date(weekStart)
        newStart.setDate(weekStart.getDate() - 7)
        setWeekStart(newStart)
    }

    const nextWeek = () => {
        const newStart = new Date(weekStart)
        newStart.setDate(weekStart.getDate() + 7)
        setWeekStart(newStart)
    }

    const goToToday = () => {
        const todayMonday = getMonday(new Date())
        setWeekStart(todayMonday)
        handleSelectDate(new Date())
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm p-4 select-none">
            {/* Month Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={prevWeek}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                    aria-label="이전 주"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={goToToday}
                    className="text-base font-bold text-slate-800 hover:text-blue-600 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50"
                >
                    {monthYearLabel}
                </button>
                <button
                    onClick={nextWeek}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                    aria-label="다음 주"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, i) => {
                    const isSelected = isSameDay(day, selectedDate)
                    const isToday = isSameDay(day, today)
                    const dateStr = formatDate(day)
                    const holiday = KOREAN_HOLIDAYS[dateStr]
                    const isSunday = i === 6
                    const isSaturday = i === 5
                    const isHoliday = !!holiday

                    return (
                        <button
                            key={i}
                            onClick={() => handleSelectDate(day)}
                            className={`
                                flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200 relative
                                ${isSelected
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                                    : isToday
                                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                        : 'hover:bg-slate-100 text-slate-700'
                                }
                            `}
                            title={holiday || undefined}
                        >
                            <span className={`text-[11px] font-medium mb-1 ${isSelected ? 'text-blue-100'
                                : (isHoliday || isSunday) ? 'text-red-400'
                                    : isSaturday ? 'text-blue-400'
                                        : 'text-slate-400'
                                }`}>
                                {DAY_LABELS[i]}
                            </span>
                            <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white'
                                : (isHoliday || isSunday) ? 'text-red-500'
                                    : isSaturday ? 'text-blue-500'
                                        : ''
                                }`}>
                                {day.getDate()}
                            </span>
                            {holiday && (
                                <span className={`text-[8px] mt-1 leading-tight text-center truncate w-full ${isSelected ? 'text-blue-200' : 'text-red-400'
                                    }`}>
                                    {holiday}
                                </span>
                            )}
                            {isHoliday && !isSelected && (
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400"></div>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Selected Date Label */}
            <div className="mt-3 text-center">
                <span className={`text-xs font-medium ${KOREAN_HOLIDAYS[formatDate(selectedDate)] ? 'text-red-500' : 'text-blue-600'
                    }`}>
                    선택된 날짜: {selectedDayLabel}
                </span>
            </div>
        </div>
    )
}
