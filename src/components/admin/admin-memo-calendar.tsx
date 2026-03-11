'use client'

import { useState, useTransition } from 'react'
import { AdminMemo, saveAdminMemo, deleteAdminMemo } from '@/actions/admin-memos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react'
import { format, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { KeyboardEvent } from 'react'

interface AdminMemoCalendarProps {
    initialDate: Date
    memos: AdminMemo[]
}

export function AdminMemoCalendar({ initialDate, memos }: AdminMemoCalendarProps) {
    const router = useRouter()
    const [currentDate, setCurrentDate] = useState(initialDate)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // default to today
    const [isPending, startTransition] = useTransition()
    const [editContent, setEditContent] = useState<string>('')

    // Generate Calendar Grid
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const dateRange = eachDayOfInterval({ start: startDate, end: endDate })

    // Find memo for selected date
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
    const selectedMemo = memos.find(m => m.memo_date === selectedDateStr)

    // Sync selected memo content into editor when selected date changes
    // Only in useEffect so it updates when clicking a different day
    import('react').then((React) => {
        React.useEffect(() => {
            setEditContent(selectedMemo?.content || '')
        }, [selectedDateStr, selectedMemo?.content])
    })


    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    const handleSaveMemo = async () => {
        if (!editContent.trim() && !selectedMemo) {
            toast.error('내용을 입력해주세요.')
            return
        }

        startTransition(async () => {
            if (!editContent.trim() && selectedMemo) {
                // Delete if empty string and it previously existed
                const res = await deleteAdminMemo(selectedDateStr)
                if (res.success) {
                    toast.success('메모가 삭제되었습니다.')
                } else {
                    toast.error(res.error)
                }
            } else {
                // Save or Update
                const res = await saveAdminMemo(selectedDateStr, editContent)
                if (res.success) {
                    toast.success('메모가 저장되었습니다.')
                } else {
                    toast.error(res.error)
                }
            }
            router.refresh()
        })
    }

    const handleDeleteMemo = async () => {
        if (!selectedMemo) return
        
        if (!confirm('정말 이 날짜의 메모를 삭제하시겠습니까?')) return

        startTransition(async () => {
            const res = await deleteAdminMemo(selectedDateStr)
            if (res.success) {
                toast.success('메모가 삭제되었습니다.')
                setEditContent('')
            } else {
                toast.error(res.error)
            }
            router.refresh()
        })
    }
    
    // Command + Enter to save
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            handleSaveMemo()
        }
    }


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <Card className="lg:col-span-2 shadow-sm order-2 lg:order-1">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                        {format(currentDate, 'yyyy년 M월', { locale: ko })}
                    </CardTitle>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                            오늘
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-1 text-center font-medium text-slate-500 mb-2">
                        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                            <div key={day} className="py-2 text-xs">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {dateRange.map((day, i) => {
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const isCurrentMonth = isSameMonth(day, currentDate)
                            const isSelected = isSameDay(day, selectedDate)
                            const isToday = isSameDay(day, new Date())
                            const dayMemo = memos.find(m => m.memo_date === dateStr)

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        min-h-[80px] p-2 flex flex-col items-start justify-start border rounded-md transition-all text-left
                                        ${!isCurrentMonth ? 'bg-slate-50 text-slate-400 opacity-60' : 'bg-white hover:bg-slate-50'}
                                        ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-50/50 outline-none' : 'border-slate-100'}
                                    `}
                                >
                                    <div className="w-full flex justify-between items-center mb-1">
                                        <span className={`
                                            inline-flex items-center justify-center w-6 h-6 text-sm rounded-full
                                            ${isToday ? 'bg-blue-600 text-white font-bold' : 'font-medium'}
                                            ${!isToday && day.getDay() === 0 ? 'text-red-500' : ''}
                                            ${!isToday && day.getDay() === 6 ? 'text-blue-500' : ''}
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                    
                                    {dayMemo && (
                                        <div className="mt-1 w-full text-xs bg-yellow-100 text-yellow-800 p-1.5 rounded overflow-hidden text-ellipsis line-clamp-2">
                                            {dayMemo.content}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Memo Editor */}
            <Card className="shadow-sm order-1 lg:order-2 self-start sticky top-6">
                <CardHeader className="pb-3 border-b bg-slate-50/50 rounded-t-xl">
                    <CardTitle className="text-lg">
                        {format(selectedDate, 'PPP', { locale: ko })}
                    </CardTitle>
                    <CardDescription>
                        {selectedMemo ? '작성된 메모를 수정합니다.' : '새로운 메모를 작성합니다.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col h-[400px]">
                    <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="이 날짜의 주요 관리자 메모, 스케줄, 특이사항 등을 기록하세요. (저장: Ctrl+Enter / Cmd+Enter)"
                        className="flex-1 resize-none bg-yellow-50/30 focus-visible:ring-yellow-500 border-yellow-200"
                    />
                    
                    <div className="mt-4 flex gap-2">
                        {selectedMemo && (
                            <Button 
                                variant="destructive" 
                                className="flex-1" 
                                onClick={handleDeleteMemo}
                                disabled={isPending}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                            </Button>
                        )}
                        <Button 
                            className={`flex-[2] ${selectedMemo ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                            onClick={handleSaveMemo}
                            disabled={isPending}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isPending ? '저장 중...' : '저장하기'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
