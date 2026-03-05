'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog'
import { Share2, Plus, Inbox, Send, Loader2, Calendar, MapPin, Ruler, CheckCircle2, AlertCircle, Trash2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { HOLIDAYS } from '@/lib/holidays'
import { toast } from 'sonner'
import {
    createSharedOrder,
    getMySharedOrders,
    getIncomingOrders,
    acceptOrder,
    updateOrderDetails,
    cancelSharedOrder,
    deleteSharedOrder,
    getOrderNotifications,
    updateSharedOrder,
    confirmOrderAssignee
} from '@/actions/shared-orders'

export default function SharedOrdersPage() {
    const [activeTab, setActiveTab] = useState('outgoing')
    const [myOrders, setMyOrders] = useState<any[]>([])
    const [incomingOrders, setIncomingOrders] = useState<any[]>([])
    const [notifications, setNotifications] = useState<any[]>([])
    // 캘린더 및 필터 상태
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    // 로딩 상태
    const [loading, setLoading] = useState(true)

    // 등록 폼 상태
    const [createOpen, setCreateOpen] = useState(false)
    const [basicInfo, setBasicInfo] = useState('') // 지역/평수/잔금 통합
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // 상세정보 입력 다이얼로그
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailOrderId, setDetailOrderId] = useState('')
    const [detailAddress, setDetailAddress] = useState('')
    const [detailPhone, setDetailPhone] = useState('')
    const [detailName, setDetailName] = useState('')
    const [detailSubmitting, setDetailSubmitting] = useState(false)

    // 수정 다이얼로그
    const [editOpen, setEditOpen] = useState(false)
    const [editOrderId, setEditOrderId] = useState('')
    const [editBasicInfo, setEditBasicInfo] = useState('')
    const [editNotes, setEditNotes] = useState('')
    const [editDate, setEditDate] = useState('')
    const [editSubmitting, setEditSubmitting] = useState(false)

    const [acceptingId, setAcceptingId] = useState<string | null>(null)
    const [confirmingId, setConfirmingId] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    // 캘린더 생성 로직
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']

    // 필터링 적용된 오더 목록
    const filteredMyOrders = selectedDate
        ? myOrders.filter(order => order.work_date === format(selectedDate, 'yyyy-MM-dd'))
        : myOrders

    const filteredIncomingOrders = selectedDate
        ? incomingOrders.filter(order => order.work_date === format(selectedDate, 'yyyy-MM-dd'))
        : incomingOrders

    async function loadData() {
        setLoading(true)
        const [my, incoming, notifs] = await Promise.all([
            getMySharedOrders(),
            getIncomingOrders(),
            getOrderNotifications()
        ])
        setMyOrders(my)
        setIncomingOrders(incoming)
        setNotifications(notifs)
        setLoading(false)
    }

    async function handleCreate() {
        if (!basicInfo.trim()) {
            toast.error('기본 정보(지역/평수/잔금)를 입력해주세요.')
            return
        }
        setSubmitting(true)
        const result = await createSharedOrder({
            region: basicInfo,
            work_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
            area_size: '',
            notes,
            address: '',
            customer_phone: '',
            customer_name: ''
        })
        if (result.success) {
            toast.success('오더가 등록되었습니다.')
            setCreateOpen(false)
            resetForm()
            loadData()
        } else {
            toast.error(result.error)
        }
        setSubmitting(false)
    }

    function resetForm() {
        setBasicInfo('')
        setNotes('')
    }

    function openEditDialog(order: any) {
        setEditOrderId(order.id)
        setEditBasicInfo(order.region || '')
        setEditNotes(order.notes || '')
        setEditDate(order.work_date || '')
        setEditOpen(true)
    }

    async function handleUpdate() {
        if (!editBasicInfo.trim()) {
            toast.error('기본 정보(지역/평수/잔금)를 입력해주세요.')
            return
        }
        setEditSubmitting(true)
        const result = await updateSharedOrder(editOrderId, {
            region: editBasicInfo,
            work_date: editDate || null,
            area_size: '',
            notes: editNotes,
            address: '',
            customer_phone: '',
            customer_name: ''
        })
        if (result.success) {
            toast.success('오더가 수정되었습니다.')
            setEditOpen(false)
            loadData()
        } else {
            toast.error(result.error)
        }
        setEditSubmitting(false)
    }

    async function handleAccept(orderId: string) {
        if (!confirm('이 오더에 대한 상세정보를 요청하시겠습니까?')) return
        setAcceptingId(orderId)
        const result = await acceptOrder(orderId)
        if (result.success) {
            toast.success('상세정보를 요청했습니다.')
            loadData()
        } else {
            toast.error(result.error)
        }
        setAcceptingId(null)
    }

    async function handleConfirm(orderId: string, companyId: string) {
        if (!confirm('해당 업체를 최종 확정하시겠습니까? 확정 시 오더가 배정됩니다.')) return
        setConfirmingId(companyId)
        const result = await confirmOrderAssignee(orderId, companyId)
        if (result.success) {
            toast.success('업체를 확정했습니다.')
            loadData()
        } else {
            toast.error(result.error)
        }
        setConfirmingId(null)
    }

    async function handleCancel(orderId: string) {
        if (!confirm('이 오더를 취소하시겠습니까?')) return
        const result = await cancelSharedOrder(orderId)
        if (result.success) {
            toast.success('오더가 취소되었습니다.')
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    async function handleDelete(orderId: string) {
        if (!confirm('이 오더를 삭제하시겠습니까? 되돌릴 수 없습니다.')) return
        const result = await deleteSharedOrder(orderId)
        if (result.success) {
            toast.success('오더가 삭제되었습니다.')
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    function openDetailDialog(order: any) {
        setDetailOrderId(order.id)
        setDetailAddress(order.address || '')
        setDetailPhone(order.customer_phone || '')
        setDetailName(order.customer_name || '')
        setDetailOpen(true)
    }

    async function handleDetailSubmit() {
        if (!detailAddress || !detailPhone) {
            toast.error('주소와 연락처를 입력해주세요.')
            return
        }
        setDetailSubmitting(true)
        const result = await updateOrderDetails(detailOrderId, detailAddress, detailPhone, detailName)
        if (result.success) {
            toast.success('상세 정보가 입력되어 현장 관리로 이관되었습니다.')
            setDetailOpen(false)
            loadData()
        } else {
            toast.error(result.error)
        }
        setDetailSubmitting(false)
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'open': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">대기중</Badge>
            case 'accepted': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">수락됨 (정보대기)</Badge>
            case 'transferred': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">이관완료</Badge>
            case 'cancelled': return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">취소됨</Badge>
            case 'deleted_by_receiver': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">수신업체 삭제</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight flex items-center">
                    <Share2 className="mr-2" /> 오더 공유 센터
                </h2>
                <div className="flex items-center justify-center p-10">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center">
                        <Share2 className="mr-2" /> 오더 공유 센터
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        오더를 등록하거나 타 업체의 오더를 확인하세요.
                    </p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            {selectedDate ? `${format(selectedDate, 'M/d')} ` : ''}오더 등록
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedDate ? format(selectedDate, 'M월 d일 ') : ''}오더 등록
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">기본 정보 (지역 / 평수 / 잔금) *</label>
                                <Input value={basicInfo} onChange={e => setBasicInfo(e.target.value)} placeholder="예: 천안아산 32평 15만원" className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">특이사항</label>
                                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="예: 오후 2시 작업 가능, 스팀 청소 추가" rows={4} className="mt-1" />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                            <Button onClick={handleCreate} disabled={submitting}>
                                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                등록
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 수정 다이얼로그 */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>오더 수정</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">기본 정보 (지역 / 평수 / 잔금) *</label>
                                <Input value={editBasicInfo} onChange={e => setEditBasicInfo(e.target.value)} className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">특이사항</label>
                                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} className="mt-1" />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                            <Button onClick={handleUpdate} disabled={editSubmitting}>
                                {editSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                수정 저장
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 캘린더 영역 */}
            <Card className="border shadow-sm overflow-hidden bg-white">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b space-y-0">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 text-slate-500">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-bold text-lg text-slate-800 tracking-tight">
                        {format(currentDate, 'yyyy년 M월', { locale: ko })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 text-slate-500">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-7 border-b bg-slate-50/80">
                        {weekDays.map((day, i) => (
                            <div key={day} className={cn(
                                "py-2 text-center text-xs font-bold text-slate-600",
                                i === 0 && "text-red-500",
                                i === 6 && "text-blue-500"
                            )}>
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-[1px]">
                        {calendarDays.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd')
                            const holidayName = HOLIDAYS[dateKey]
                            const isHoliday = !!holidayName
                            const isSunday = day.getDay() === 0
                            const isSaturday = day.getDay() === 6
                            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

                            // 달력 표기용 점 계산
                            const dayMyOrders = myOrders.filter(o => o.work_date === dateKey)
                            const dayIncomingOrders = incomingOrders.filter(o => o.work_date === dateKey)

                            // 클릭 핸들러: 이미 선택된 날짜를 누르면 리셋, 아니면 선택
                            const handleDateClick = () => {
                                if (selectedDate && isSameDay(selectedDate, day)) setSelectedDate(null)
                                else setSelectedDate(day)
                            }

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={handleDateClick}
                                    className={cn(
                                        "bg-white p-1 pb-2 min-h-[50px] sm:min-h-[70px] flex flex-col items-center relative transition-colors cursor-pointer group",
                                        !isSameMonth(day, monthStart) && "bg-slate-50/50 opacity-50",
                                        isSelected && "bg-blue-50/50 ring-inset ring-2 ring-blue-500 rounded"
                                    )}
                                >
                                    <div className="flex flex-col items-center w-full mt-1">
                                        <span className={cn(
                                            "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                                            isToday(day) && "bg-slate-900 text-white shadow-sm",
                                            !isToday(day) && (isSunday || isHoliday) && "text-red-500",
                                            !isToday(day) && !isHoliday && isSaturday && "text-blue-500",
                                            isSelected && !isToday(day) && "bg-blue-100 text-blue-700 font-bold"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                        {holidayName && (
                                            <span className="text-[8px] text-red-500 font-medium truncate w-full text-center mt-0.5 px-0.5">
                                                {holidayName}
                                            </span>
                                        )}
                                        <div className="flex gap-1 mt-auto pb-0.5 pt-1 justify-center items-center w-full">
                                            <span className={cn(
                                                "text-[10px] sm:text-xs font-medium",
                                                (dayMyOrders.length + dayIncomingOrders.length) > 0 ? "text-blue-600 font-bold" : "text-slate-400"
                                            )}>
                                                ( {dayMyOrders.length + dayIncomingOrders.length} )
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* 필터 안내 배너 */}
            {selectedDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between text-blue-800 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                        <CalendarDays className="h-4 w-4" />
                        {format(selectedDate, 'yyyy년 M월 d일')} 오더만 표시 중
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)} className="h-7 px-2 text-blue-700 hover:bg-blue-100">
                        전체 보기
                    </Button>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="outgoing" className="flex items-center gap-2">
                        <Send className="h-4 w-4" /> 내 오더 ({filteredMyOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="incoming" className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" /> 수신함 ({filteredIncomingOrders.length})
                    </TabsTrigger>
                </TabsList>

                {/* 오더 등록 탭 */}
                <TabsContent value="outgoing" className="mt-4 space-y-4">
                    {filteredMyOrders.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                <Send className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>등록한 오더가 없습니다.</p>
                                <p className="text-xs mt-1">상단의 &quot;오더 등록&quot; 버튼으로 새 오더를 등록하세요.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredMyOrders.map(order => (
                            <Card key={order.id} className="overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-5 w-5 text-blue-500 shrink-0" />
                                                <span className="font-bold text-lg leading-tight">{order.region}</span>
                                            </div>
                                            {(order.work_date || order.area_size) && (
                                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                                    {order.work_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {order.work_date}
                                                        </span>
                                                    )}
                                                    {order.area_size && (
                                                        <span className="flex items-center gap-1">
                                                            <Ruler className="h-3.5 w-3.5" />
                                                            {order.area_size}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {getStatusBadge(order.status)}
                                    </div>

                                    {order.notes && (
                                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded mb-3">{order.notes}</p>
                                    )}

                                    {order.accepted_company?.name && (
                                        <div className="mb-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                            <p className="text-sm font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                                                <CheckCircle2 className="w-4 h-4" />
                                                최종 배정 업체: {order.accepted_company.name}
                                            </p>
                                            {order.accepted_company.code && (
                                                <p className="text-xs text-emerald-600 pl-5">
                                                    (업체코드: {order.accepted_company.code})
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {order.status === 'open' && order.applicants && order.applicants.length > 0 && (
                                        <div className="mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
                                            <p className="text-sm font-semibold text-orange-800 mb-2">
                                                요청 업체 ({order.applicants.length}곳)
                                            </p>
                                            <div className="space-y-2">
                                                {order.applicants.map((app: any) => (
                                                    <div key={app.id} className="flex items-center justify-between text-sm bg-white p-2 rounded shadow-sm border border-slate-100">
                                                        <span>{app.name}</span>
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs bg-orange-500 hover:bg-orange-600 outline-none"
                                                            onClick={() => handleConfirm(order.id, app.id)}
                                                            disabled={confirmingId === app.id}
                                                        >
                                                            {confirmingId === app.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                            확정
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        {order.status === 'accepted' && (!order.address || !order.customer_phone) && (
                                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => openDetailDialog(order)}>
                                                <AlertCircle className="h-4 w-4 mr-1" />
                                                상세 정보 입력
                                            </Button>
                                        )}
                                        {(order.status === 'open' || order.status === 'deleted_by_receiver') && (
                                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openEditDialog(order)}>
                                                수정
                                            </Button>
                                        )}
                                        {order.status === 'open' && (
                                            <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleCancel(order.id)}>
                                                취소
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(order.id)}>
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            삭제
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                {/* 오더 수신함 탭 */}
                <TabsContent value="incoming" className="mt-4 space-y-4">
                    {filteredIncomingOrders.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                <Inbox className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>{selectedDate ? '선택한 날짜에 ' : ''}수신된 오더가 없습니다.</p>
                                <p className="text-xs mt-1">공유 활성화된 업체의 오더가 여기에 표시됩니다.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredIncomingOrders.map(order => (
                            <Card key={order.id} className="overflow-hidden border-l-4 border-l-orange-400">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-5 w-5 text-blue-500 shrink-0" />
                                                <span className="font-bold text-lg leading-tight">{order.region}</span>
                                            </div>
                                            {(order.work_date || order.area_size) && (
                                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                                    {order.work_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {order.work_date}
                                                        </span>
                                                    )}
                                                    {order.area_size && (
                                                        <span className="flex items-center gap-1">
                                                            <Ruler className="h-3.5 w-3.5" />
                                                            {order.area_size}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                                            {order.sender_company?.name || '타업체'}
                                        </Badge>
                                    </div>

                                    {order.notes && (
                                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded mb-3">{order.notes}</p>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            className={cn("flex-1", order.is_applied ? "bg-slate-400 hover:bg-slate-400" : "bg-blue-600 hover:bg-blue-700")}
                                            onClick={() => handleAccept(order.id)}
                                            disabled={acceptingId === order.id || order.is_applied}
                                        >
                                            {acceptingId === order.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                            )}
                                            {order.is_applied ? '상세정보 요청중' : '상세정보 요청'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                            onClick={() => handleDelete(order.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>

            {/* 상세 정보 입력 Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>상세 정보 입력</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500">
                        수락 업체에서 상세 정보를 요청했습니다. 주소와 연락처를 입력하면 현장 관리로 자동 이관됩니다.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">주소 *</label>
                            <Input value={detailAddress} onChange={e => setDetailAddress(e.target.value)} placeholder="상세 주소" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">고객 연락처 *</label>
                            <Input value={detailPhone} onChange={e => setDetailPhone(e.target.value)} placeholder="010-0000-0000" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">고객명</label>
                            <Input value={detailName} onChange={e => setDetailName(e.target.value)} placeholder="고객명" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                        <Button onClick={handleDetailSubmit} disabled={detailSubmitting}>
                            {detailSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            입력 완료 및 이관
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
