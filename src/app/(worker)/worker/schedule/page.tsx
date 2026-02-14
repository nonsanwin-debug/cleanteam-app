'use client'

import { useEffect, useState, useRef } from 'react'
import { getAssignedSites } from '@/actions/worker'
import { getMyASRequests } from '@/actions/as-manage'
import { ASRequest } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { HOLIDAYS } from '@/lib/holidays'

// Type definition
type AssignedSite = {
    id: string
    name: string
    address: string
    status: 'scheduled' | 'in_progress' | 'completed'
    created_at: string
    cleaning_date?: string
    start_time?: string
    payment_status?: 'requested' | 'paid'
    claimed_amount?: number
}

export default function WorkerSchedulePage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [sites, setSites] = useState<AssignedSite[]>([])
    const [asRequests, setAsRequests] = useState<ASRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSite, setSelectedSite] = useState<AssignedSite | null>(null)
    const [claimAmount, setClaimAmount] = useState('')
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [sitesData, asData] = await Promise.all([
                getAssignedSites(),
                getMyASRequests()
            ])
            setSites(sitesData)
            setAsRequests(asData)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    // Generate calendar days
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const weekDays = ['일', '월', '화', '수', '목', '금', '토']

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    }


    return (
        <div className="space-y-4 h-full flex flex-col relative">
            <div className="flex items-center justify-between pointer-events-none">
                {/* pointer-events-none to prevent accidental clicks while loading, though inputs are standard */}
            </div>

            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold flex items-center">
                    <CalendarIcon className="mr-2" />
                    일정 관리
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold text-lg w-24 text-center">
                        {format(currentDate, 'yyyy.MM', { locale: ko })}
                    </span>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col min-h-[500px]">
                <CardContent className="p-0 flex flex-col h-full">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b bg-slate-50">
                        {weekDays.map((day, i) => (
                            <div key={day} className={cn(
                                "py-2 text-center text-sm font-medium text-slate-500",
                                i === 0 && "text-red-500",
                                i === 6 && "text-blue-500"
                            )}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-200 gap-px border-b">
                        {calendarDays.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd')
                            const holidayName = HOLIDAYS[dateKey]
                            const isHoliday = !!holidayName
                            const isSunday = day.getDay() === 0
                            const isSaturday = day.getDay() === 6

                            // Filter sites for this day
                            const daySites = sites.filter(site => {
                                const siteDateStr = site.cleaning_date || site.created_at
                                return isSameDay(new Date(siteDateStr), day)
                            })

                            return (
                                <div
                                    key={day.toString()}
                                    className={cn(
                                        "bg-white p-1 min-h-[80px] sm:min-h-[100px] flex flex-col gap-1 relative overflow-hidden transition-colors hover:bg-slate-50",
                                        !isSameMonth(day, monthStart) && "bg-slate-50/50 text-slate-400"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col items-center">
                                            <span className={cn(
                                                "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                                isToday(day) && "bg-slate-900 text-white",
                                                !isToday(day) && (isSunday || isHoliday) && "text-red-500",
                                                !isToday(day) && !isHoliday && isSaturday && "text-blue-500"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            {holidayName && (
                                                <span className="text-[10px] text-red-500 font-medium truncate max-w-[40px] leading-tight text-center mt-0.5">
                                                    {holidayName}
                                                </span>
                                            )}
                                        </div>
                                        {daySites.length > 0 && <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">{daySites.length}건</span>}
                                    </div>

                                    <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[120px] scrollbar-hide">
                                        {daySites.map(site => (
                                            <div
                                                key={site.id}
                                                className={cn(
                                                    "text-[10px] p-1 rounded border shadow-sm group",
                                                    site.status === 'completed' ? "bg-slate-100 border-slate-200 text-slate-500" :
                                                        site.status === 'in_progress' ? "bg-blue-50 border-blue-200 text-blue-700 font-medium" :
                                                            "bg-white border-green-200 text-green-700"
                                                )}
                                            >
                                                <div className="font-semibold truncate leading-tight">{site.name}</div>
                                                {site.start_time && <div className="text-[9px] opacity-80 mt-0.5">{site.start_time}</div>}

                                                {site.status === 'completed' && (
                                                    <div className="mt-1">
                                                        {site.payment_status === 'paid' ? (
                                                            <div className="text-[9px] text-green-600 font-bold bg-green-50 px-1 rounded inline-block">
                                                                지급완료
                                                            </div>
                                                        ) : site.payment_status === 'requested' ? (
                                                            <div className="space-y-0.5">
                                                                <div className="text-[9px] text-orange-600 font-bold bg-orange-50 px-1 rounded inline-block">
                                                                    청구완료
                                                                </div>
                                                                {site.claimed_amount && (
                                                                    <div className="text-[9px] text-slate-600 font-medium">
                                                                        {site.claimed_amount.toLocaleString()}원
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="w-full bg-slate-800 text-white text-[9px] py-0.5 rounded hover:bg-slate-700 transition-colors cursor-pointer touch-manipulation"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setSelectedSite(site)
                                                                    setClaimAmount('')
                                                                    setIsClaimModalOpen(true)
                                                                }}
                                                                onTouchEnd={(e) => {
                                                                    // iOS sometimes needs this if onClick fails in certain contexts
                                                                    // But prevent double firing if onClick works
                                                                    e.stopPropagation()
                                                                }}
                                                            >
                                                                비용청구
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* AS 내역 섹션 */}
            {asRequests.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        AS 내역
                        <Badge variant="destructive" className="text-xs">{asRequests.length}건</Badge>
                    </h3>
                    {asRequests.map(req => (
                        <Card key={req.id} className="border-red-100">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-sm">
                                        {req.site?.name || req.site_name}
                                    </div>
                                    <Badge variant={
                                        req.status === 'resolved' ? 'outline' :
                                            req.status === 'monitoring' ? 'secondary' : 'destructive'
                                    } className={cn(
                                        "text-[10px]",
                                        req.status === 'resolved' && "border-green-500 text-green-600 bg-green-50"
                                    )}>
                                        {req.status === 'resolved' ? '처리 완료' :
                                            req.status === 'monitoring' ? '모니터링' : '접수/대기'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">{req.description}</p>
                                {req.processing_details && (
                                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded mb-2">
                                        <span className="font-medium">처리결과:</span> {req.processing_details}
                                    </p>
                                )}
                                {req.photos && req.photos.length > 0 && (
                                    <div className="flex gap-2 mb-2 flex-wrap">
                                        {req.photos.map((url, idx) => (
                                            <img key={idx} src={url} alt="AS사진" className="w-16 h-16 rounded border object-cover" />
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>발생일: {req.occurred_at}</span>
                                    {req.penalty_amount && req.penalty_amount > 0 && (
                                        <span className="text-red-500 font-semibold">
                                            차감: -{req.penalty_amount.toLocaleString()}원
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

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
                alert('비용 청구가 완료되었습니다.')
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold">비용 청구</h3>
                    <p className="text-sm text-slate-500">
                        <span className="font-semibold">{site.name}</span><br />
                        상세 청구 내역을 입력해주세요.
                    </p>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">청구 항목</label>
                            <Button variant="ghost" size="sm" onClick={handleAddItem} className="h-6 text-xs">
                                + 항목 추가
                            </Button>
                        </div>

                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    className="flex-1 h-9 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    placeholder="항목명 (예: 식대, 자재비)"
                                    value={item.name}
                                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                />
                                <input
                                    type="number"
                                    className="w-24 h-9 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    placeholder="금액"
                                    value={item.amount}
                                    onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                                />
                                {items.length > 1 && (
                                    <button onClick={() => handleRemoveItem(idx)} className="text-red-500 p-2">✕</button>
                                )}
                            </div>
                        ))}

                        <div className="flex justify-end text-sm font-bold text-slate-900 border-t pt-2">
                            합계: {totalAmount.toLocaleString()}원
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">영수증/증빙 사진</label>
                        <div className="flex flex-wrap gap-2">
                            {photos.map((url, idx) => (
                                <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden">
                                    <img src={url} alt="receipt" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                                        className="absolute top-0 right-0 bg-black/50 text-white w-4 h-4 flex items-center justify-center text-[10px]"
                                    >✕</button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-16 h-16 rounded border border-dashed flex items-center justify-center text-slate-400 hover:bg-slate-50"
                                disabled={uploading}
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : '+'}
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

                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            취소
                        </Button>
                        <Button className="flex-1" onClick={handleSubmit} disabled={submitting || uploading}>
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            청구하기
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
