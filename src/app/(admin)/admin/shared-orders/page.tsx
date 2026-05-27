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
import { Share2, Plus, Inbox, Send, Loader2, Calendar, MapPin, Ruler, CheckCircle2, AlertCircle, Trash2, ChevronLeft, ChevronRight, CalendarDays, Activity, EyeOff, Eye, Users } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
    createSharedOrder,
    getMySharedOrders,
    getIncomingOrders,
    acceptOrder,
    reclaimSharedOrder,
    cancelSharedOrder,
    deleteSharedOrder,
    getOrderNotifications,
    updateSharedOrder,
    confirmOrderAssignee
} from '@/actions/shared-orders'
import { SharedOrderParserDialog } from '@/components/admin/shared-order-parser-dialog'

export default function SharedOrdersPage() {
    const [incomingOrders, setIncomingOrders] = useState<any[]>([])
    const [outgoingOrders, setOutgoingOrders] = useState<any[]>([])
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

    const [showHidden, setShowHidden] = useState(false)

    const [acceptingId, setAcceptingId] = useState<string | null>(null)
    const [confirmingId, setConfirmingId] = useState<string | null>(null)

    const [hiddenOrders, setHiddenOrders] = useState<string[]>([])
    const [hideWallet, setHideWallet] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('adminHiddenOrders')
        if (stored) {
            try { setHiddenOrders(JSON.parse(stored)) } catch (e) {}
        }
    }, [])

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
        const [incoming, outgoing, notifs] = await Promise.all([
            getIncomingOrders(),
            getMySharedOrders(),
            getOrderNotifications()
        ])
        setIncomingOrders(incoming)
        setOutgoingOrders(outgoing)
        setNotifications(notifs)

        try {
            const { getPlatformSettings } = await import('@/actions/platform-settings')
            const settings = await getPlatformSettings()
            setHideWallet(settings.hide_wallet_features)
        } catch (e) {
            console.error('Failed to load platform settings', e)
        }

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

    async function handleAccept(orderId: string, isDirectShare = false) {
        const confirmMsg = isDirectShare
            ? '이 공유 오더를 수락하시겠습니까? 수락 시 즉시 현장 관리로 이관됩니다.'
            : '이 오더에 대한 상세정보를 요청하시겠습니까?'
        if (!confirm(confirmMsg)) return
        setAcceptingId(orderId)
        const result = await acceptOrder(orderId)
        if (result.success) {
            toast.success(isDirectShare ? '오더를 수락하여 현장이 이관되었습니다.' : '상세정보를 요청했습니다.')
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

    async function handleReclaim(orderId: string) {
        if (!confirm('이 공유 오더를 회수하시겠습니까? 회수 시 수신사의 현장 카드도 강제 소멸됩니다.')) return
        const result = await reclaimSharedOrder(orderId)
        if (result.success) {
            toast.success('오더가 회수되었습니다.')
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    function handleHide(orderId: string) {
        if (!confirm('이 오더를 목록에서 숨기시겠습니까? 로컬 브라우저에 숨김 상태가 저장됩니다.')) return
        setHiddenOrders(prev => {
            const next = [...prev, orderId]
            localStorage.setItem('adminHiddenOrders', JSON.stringify(next))
            return next
        })
        toast.success('오더가 숨김 처리되었습니다.')
    }

    function handleUnhide(orderId: string) {
        if (!confirm('이 오더를 다시 목록에 표시하시겠습니까?')) return
        setHiddenOrders(prev => {
            const next = prev.filter(id => id !== orderId)
            localStorage.setItem('adminHiddenOrders', JSON.stringify(next))
            return next
        })
        toast.success('오더가 다시 목록에 표시됩니다.')
    }

    function openDetailDialog(order: any) {
        setDetailOrderId(order.id)
        setDetailOpen(true)
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'open': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">대기중</Badge>
            case 'pending': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">수락대기</Badge>
            case 'accepted': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">수락됨 (정보대기)</Badge>
            case 'transferred': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">이관완료</Badge>
            case 'reclaimed': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">회수됨</Badge>
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
                        파트너사 간 오더를 수발신하고 공유 이관 상태를 모니터링합니다.
                    </p>
                </div>
                <Button 
                    variant={showHidden ? "default" : "outline"} 
                    className={showHidden ? "bg-slate-700 hover:bg-slate-800" : "text-slate-600 bg-white"}
                    onClick={() => setShowHidden(!showHidden)}
                >
                    {showHidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                    {showHidden ? '숨김 오더 닫기' : '숨긴 오더 보기'}
                </Button>
            </div>

            <div className="mt-4">
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

            <Tabs defaultValue="incoming" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="incoming" className="flex items-center gap-2">
                        <Inbox className="w-4 h-4" />
                        수신 오더 (받은 공유)
                        {incomingOrders.filter(o => o.status === 'pending').length > 0 && (
                            <Badge className="bg-red-500 text-white hover:bg-red-600 h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] px-1 ml-1 animate-pulse">
                                {incomingOrders.filter(o => o.status === 'pending').length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="outgoing" className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        발신 오더 (보낸 공유)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="incoming" className="mt-6">
                    {/* 오더 수신 리스트 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {(() => {
                            const displayOrders = showHidden 
                                ? incomingOrders.filter(o => hiddenOrders.includes(o.id))
                                : incomingOrders.filter(o => !hiddenOrders.includes(o.id));

                            if (displayOrders.length === 0) {
                                return (
                                    <Card className="col-span-1 lg:col-span-2 xl:col-span-3">
                                        <CardContent className="py-16 text-center text-muted-foreground">
                                            {showHidden ? (
                                                <EyeOff className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            ) : (
                                                <Inbox className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            )}
                                            <p>{showHidden ? '숨김 처리된 오더가 없습니다.' : '수신된 오더가 없습니다.'}</p>
                                            <p className="text-xs mt-1">공유 오픈된 업체의 오더가 여기에 조희됩니다.</p>
                                        </CardContent>
                                    </Card>
                                )
                            }

                            return displayOrders.map(order => {
                                const parsedDetails = order.parsed_details || {}
                                const isDiscount = parsedDetails.reward_type === 'discount'
                                const isDirectShare = parsedDetails.is_direct_share === true
                                
                                let extractedPrice = 0
                                if (order.region) {
                                    const manwonMatch = order.region.match(/([\d.]+)만원/)
                                    if (manwonMatch && manwonMatch[1]) {
                                        extractedPrice = Math.floor(parseFloat(manwonMatch[1]) * 10000)
                                    } else {
                                        const wonMatch = order.region.match(/([\d,]+)원/)
                                        if (wonMatch && wonMatch[1]) {
                                            extractedPrice = parseInt(wonMatch[1].replace(/,/g, ''), 10)
                                        }
                                    }
                                }
                                const orderPrice = order.total_price || extractedPrice || (parsedDetails.estimated_price ? Number(parsedDetails.estimated_price) : 0)
                                const requiredCash = isDiscount ? Math.round(orderPrice / 9) : Math.floor(orderPrice * 0.2)

                                return (
                                    <Card key={order.id} className={cn("overflow-hidden border-2", order.status === 'pending' ? "border-amber-400 shadow-amber-100" : isDiscount ? "border-rose-400 shadow-rose-100" : "border-teal-400 shadow-teal-100")}>
                                        <CardContent className="p-4">
                                            <div className="flex flex-col gap-3 mb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-5 w-5 text-blue-500 shrink-0" />
                                                        <span className="font-bold text-lg leading-tight">{order.region}</span>
                                                    </div>
                                                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 shrink-0">
                                                        {(order.status === 'transferred' || order.status === 'completed' || order.status === 'pending' || order.status === 'reclaimed' || isDirectShare) ? (order.sender_company?.name || '타업체') : '제휴업체 (배정 후 공개)'}
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
                                                
                                                {!isDirectShare && !hideWallet && (
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
                                                )}
                                                
                                                {isDirectShare && (
                                                    <div className="bg-amber-50 border border-amber-100 p-2.5 rounded text-xs text-amber-800 space-y-1">
                                                        <p className="font-bold">🔗 직접 공유 오더 (수락 대기)</p>
                                                        <p>제휴 부동산/파트너사에서 다이렉트로 전달해 준 오더입니다.</p>
                                                    </div>
                                                )}
                                            </div>

                                        {/* parsed_details 상세 정보 (고객 링크 예약) */}
                                        {parsedDetails.source === 'customer_link' && (
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3 space-y-1.5">
                                                {[
                                                    parsedDetails.cleaning_type && { label: '작업종류', value: parsedDetails.cleaning_type },
                                                    parsedDetails.residential_type && { label: '주거형태', value: parsedDetails.residential_type },
                                                    parsedDetails.structure_type && { label: '구조', value: parsedDetails.structure_type },
                                                    parsedDetails.building_condition && { label: '건물상태', value: parsedDetails.building_condition },
                                                    parsedDetails.time_preference && { label: '희망시간', value: parsedDetails.time_preference },
                                                ].filter(Boolean).map((item: any, i: number) => (
                                                    <div key={i} className="flex items-start gap-2 text-sm">
                                                        <span className="bg-slate-200/50 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 min-w-20 text-center mt-0.5">
                                                            {item.label}
                                                        </span>
                                                        <span className="text-slate-700 flex-1 break-words">{item.value}</span>
                                                    </div>
                                                ))}
                                                {orderPrice > 0 && (
                                                    <div className="flex items-start gap-2 text-sm">
                                                        <span className="bg-slate-200/50 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 min-w-20 text-center mt-0.5">
                                                            견적금액
                                                        </span>
                                                        <span className="text-slate-800 font-bold flex-1">{orderPrice.toLocaleString()}원</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

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
                                            {order.status === 'pending' ? (
                                                <Button
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleAccept(order.id, true)}
                                                    disabled={acceptingId === order.id}
                                                >
                                                    {acceptingId === order.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    )}
                                                    오더 수락하기
                                                </Button>
                                            ) : (
                                                <Button
                                                    className={cn("flex-1", order.is_applied ? "bg-slate-400 hover:bg-slate-400" : "bg-blue-600 hover:bg-blue-700")}
                                                    onClick={() => handleAccept(order.id, false)}
                                                    disabled={acceptingId === order.id || order.is_applied}
                                                >
                                                    {acceptingId === order.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    )}
                                                    {order.is_applied ? '배정 요청됨' : '배정 요청'}
                                                </Button>
                                            )}

                                            {showHidden ? (
                                                <Button
                                                    variant="outline"
                                                    className="text-slate-700 border-slate-300 hover:bg-slate-100"
                                                    onClick={() => handleUnhide(order.id)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    다시 보기
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    className="text-slate-500 border-slate-200 hover:bg-slate-50"
                                                    onClick={() => handleHide(order.id)}
                                                >
                                                    <EyeOff className="w-4 h-4 mr-2" />
                                                    숨김
                                                </Button>
                                            )}
                                        </div>
                                        {!isDirectShare && !hideWallet && (
                                            <p className="text-red-500 text-[13px] font-bold text-center mt-3 tracking-tight">※배정이 확정되면 시스템 상에서 즉시 {isDiscount ? "10%" : "20%"}의 캐쉬가 차감됩니다. ※</p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        });
                        })()}
                    </div>
                </TabsContent>

                <TabsContent value="outgoing" className="mt-6">
                    {/* 오더 발신 리스트 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {outgoingOrders.length === 0 ? (
                            <Card className="col-span-1 lg:col-span-2 xl:col-span-3">
                                <CardContent className="py-16 text-center text-muted-foreground">
                                    <Send className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p>보낸 공유 오더가 없습니다.</p>
                                    <p className="text-xs mt-1">현장 관리 메뉴에서 파트너사에게 오더를 공유할 수 있습니다.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            outgoingOrders.map(order => {
                                const parsedDetails = order.parsed_details || {}
                                const isDirectShare = parsedDetails.is_direct_share === true
                                
                                return (
                                    <Card key={order.id} className="overflow-hidden border-2 border-slate-200 shadow-sm bg-white">
                                        <CardContent className="p-4">
                                            <div className="flex flex-col gap-3 mb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-5 w-5 text-blue-500 shrink-0" />
                                                        <span className="font-bold text-lg leading-tight">{order.region}</span>
                                                    </div>
                                                    {getStatusBadge(order.status)}
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
                                                
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs text-slate-700">
                                                    {order.customer_name && (
                                                        <p><strong>고객명:</strong> {order.customer_name}</p>
                                                    )}
                                                    {order.customer_phone && (
                                                        <p><strong>연락처:</strong> {order.customer_phone}</p>
                                                    )}
                                                    {isDirectShare && (
                                                        <p><strong>공유 대상:</strong> {order.accepted_company?.name ? `${order.accepted_company.name}#${order.accepted_company.code || '0000'}` : '파트너사'}</p>
                                                    )}
                                                    {order.notes && (
                                                        <p className="text-xs text-slate-500 whitespace-pre-wrap mt-1"><strong>특이사항:</strong> {order.notes}</p>
                                                    )}
                                                </div>

                                                {/* Applicants for Open Orders */}
                                                {!isDirectShare && order.status === 'open' && order.applicants && order.applicants.length > 0 && (
                                                    <div className="border-t pt-3 mt-1 space-y-2">
                                                        <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                                            <Users className="w-3.5 h-3.5" /> 지원 업체 목록 ({order.applicants.length})
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            {order.applicants.map((app: any) => (
                                                                <div key={app.id} className="flex items-center justify-between bg-white border p-2 rounded text-xs">
                                                                    <span>{app.name}#{app.code}</span>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                                                                        onClick={() => handleConfirm(order.id, app.id)}
                                                                        disabled={confirmingId === app.id}
                                                                    >
                                                                        {confirmingId === app.id ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            '배정확정'
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 mt-2">
                                                {(order.status === 'pending' || order.status === 'transferred') && (
                                                    <Button
                                                        variant="destructive"
                                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm"
                                                        onClick={() => handleReclaim(order.id)}
                                                    >
                                                        오더 회수
                                                    </Button>
                                                )}
                                                {order.status === 'open' && (
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 text-slate-600 hover:bg-slate-100 text-sm"
                                                        onClick={() => handleCancel(order.id)}
                                                    >
                                                        오더 취소 (비활성화)
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </div>
                </TabsContent>
            </Tabs>

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
        </div>
    )
}
