'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Share2, Plus, Inbox, Send, Loader2, Calendar, MapPin, Ruler, CheckCircle2, AlertCircle, Trash2, ChevronLeft, ChevronRight, CalendarDays, Activity } from 'lucide-react'
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
    cancelSharedOrder,
    deleteSharedOrder,
    getOrderNotifications,
    updateSharedOrder,
    confirmOrderAssignee
} from '@/actions/shared-orders'
import { SharedOrderParserDialog } from '@/components/admin/shared-order-parser-dialog'

export default function SharedOrdersPage() {
    const [incomingOrders, setIncomingOrders] = useState<any[]>([])
    const [notifications, setNotifications] = useState<any[]>([])

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

        const supabase = createClient()
        const channel = supabase.channel('admin-orders-refresh')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shared_orders' },
                () => {
                    loadData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function loadData() {
        setLoading(true)
        const [incoming, notifs] = await Promise.all([
            getIncomingOrders(),
            getOrderNotifications()
        ])
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
            work_date: format(new Date(), 'yyyy-MM-dd'),
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
        setDetailOpen(true)
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'open': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">대기중</Badge>
            case 'accepted': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">수락됨 (정보대기)</Badge>
            case 'transferred': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">이관완료</Badge>
            case 'cancelled': return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">취소됨</Badge>
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
                            오더 등록
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>오더 등록</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">기본 정보 (지역 / 평수 / 잔금) *</label>
                                <Input value={basicInfo} onChange={e => setBasicInfo(e.target.value)} placeholder="예: 서울 32평 32만원" className="mt-1" />
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

            {/* 오더 수신 리스트 */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {incomingOrders.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>수신된 오더가 없습니다.</p>
                            <p className="text-xs mt-1">공유 오픈된 업체의 오더가 여기에 표시됩니다.</p>
                        </CardContent>
                    </Card>
                ) : (
                    incomingOrders.map(order => {
                        const parsedDetails = order.parsed_details || {}
                        const isDiscount = parsedDetails.reward_type === 'discount'
                        const feeRate = isDiscount ? 0.1 : 0.2
                        
                        let extractedPrice = 0
                        if (order.region) {
                            const priceMatch = order.region.match(/([\d.]+)만원/)
                            if (priceMatch && priceMatch[1]) {
                                extractedPrice = Math.floor(parseFloat(priceMatch[1]) * 10000)
                            }
                        }
                        const orderPrice = order.total_price || extractedPrice || 0
                        const requiredCash = Math.floor(orderPrice * feeRate)

                        return (
                            <Card key={order.id} className="overflow-hidden border-l-4 border-l-orange-400">
                                <CardContent className="p-4">
                                    <div className="flex flex-col gap-3 mb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-5 w-5 text-blue-500 shrink-0" />
                                                <span className="font-bold text-lg leading-tight">{order.region}</span>
                                            </div>
                                            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 shrink-0">
                                                {order.sender_company?.name || '타업체'}
                                            </Badge>
                                        </div>
                                        
                                        {(order.work_date || order.area_size) && (
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
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
                                        
                                        <div className="flex flex-col items-start gap-1.5 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Badge className={cn("border bg-white shadow-sm font-semibold tracking-tight", isDiscount ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-teal-200 text-teal-600 hover:bg-teal-50")}>
                                                    수수료 {isDiscount ? '10%' : '20%'} | 필요 캐쉬 ({requiredCash.toLocaleString()} C)
                                                </Badge>
                                            </div>
                                            <div className={cn("text-xs font-semibold pl-1 leading-snug", isDiscount ? "text-rose-500" : "text-teal-600")}>
                                                오더 제공자가 {isDiscount ? '할인을' : '리워드를'} 선택 했습니다.<br/>
                                                {isDiscount ? '잔금이 낮아지므로 수수료는 10% 입니다.' : '잔금할인이 없으므로 수수료는 20% 입니다.'}
                                            </div>
                                        </div>
                                    </div>

                                {order.notes && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3 space-y-1.5">
                                        {(() => {
                                            if (!order.notes.includes('[')) {
                                                return <div className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</div>
                                            }
                                            
                                            const rType = order.residential_type || parsedDetails.residential_type || '';
                                            const sType = order.structure_type || parsedDetails.structure_type || '';

                                            const lines = order.notes.split('\n').filter((l: string) => !l.startsWith('[혜택선택]'));
                                            
                                            return (
                                                <>
                                                    {rType && (
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <span className="bg-slate-200/50 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 min-w-20 text-center mt-0.5">
                                                                주거 형태
                                                            </span>
                                                            <span className="text-slate-700 flex-1 break-words">{rType}</span>
                                                        </div>
                                                    )}
                                                    {sType && (
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <span className="bg-slate-200/50 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 min-w-20 text-center mt-0.5">
                                                                구조
                                                            </span>
                                                            <span className="text-slate-700 flex-1 break-words">{sType}</span>
                                                        </div>
                                                    )}
                                                    {lines.map((line: string, i: number) => {
                                                        const match = line.match(/^\[(.*?)\]\s*(.*)$/);
                                                        if (match) {
                                                            return (
                                                                <div key={i} className="flex items-start gap-2 text-sm">
                                                                    <span className="bg-slate-200/50 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 min-w-20 text-center mt-0.5">
                                                                        {match[1]}
                                                                    </span>
                                                                    <span className="text-slate-700 flex-1 break-words">{match[2]}</span>
                                                                </div>
                                                            )
                                                        }
                                                        if (line.trim()) {
                                                            return <div key={i} className="text-sm text-slate-600 pl-[5.5rem] whitespace-pre-wrap break-words">{line}</div>
                                                        }
                                                        return null;
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </div>
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
                                        {order.is_applied ? '배정 요청됨' : '배정 요청'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDelete(order.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-red-500 text-[13px] font-bold text-center mt-3 tracking-tight">※배정이 확정되면 예약금 10%를 요청하세요 ※</p>
                            </CardContent>
                        </Card>
                    )})
                )}
            </div>

            {/* 상세 정보 입력 (AI) Dialog */}
            <SharedOrderParserDialog
                orderId={detailOrderId}
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open)
                    if (!open) {
                        loadData() // Fetch latest status after closing
                    }
                }}
            />
        </div >
    )
}
