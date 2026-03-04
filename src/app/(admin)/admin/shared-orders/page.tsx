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
import { Share2, Plus, Inbox, Send, Loader2, Calendar, MapPin, Ruler, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    createSharedOrder,
    getMySharedOrders,
    getIncomingOrders,
    acceptOrder,
    updateOrderDetails,
    cancelSharedOrder,
    deleteSharedOrder,
    getOrderNotifications
} from '@/actions/shared-orders'

export default function SharedOrdersPage() {
    const [activeTab, setActiveTab] = useState('outgoing')
    const [myOrders, setMyOrders] = useState<any[]>([])
    const [incomingOrders, setIncomingOrders] = useState<any[]>([])
    const [notifications, setNotifications] = useState<any[]>([])
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

    const [acceptingId, setAcceptingId] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

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
            work_date: '',
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

    async function handleAccept(orderId: string) {
        if (!confirm('이 오더를 수락하시겠습니까?')) return
        setAcceptingId(orderId)
        const result = await acceptOrder(orderId)
        if (result.success) {
            toast.success('오더를 수락했습니다.')
            loadData()
        } else {
            toast.error(result.error)
        }
        setAcceptingId(null)
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
                            <Plus className="h-4 w-4 mr-2" /> 오더 등록
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>오더 등록</DialogTitle>
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
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="outgoing" className="flex items-center gap-2">
                        <Send className="h-4 w-4" /> 오더 등록 ({myOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="incoming" className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" /> 오더 수신함 ({incomingOrders.length})
                    </TabsTrigger>
                </TabsList>

                {/* 오더 등록 탭 */}
                <TabsContent value="outgoing" className="mt-4 space-y-4">
                    {myOrders.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                <Send className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>등록한 오더가 없습니다.</p>
                                <p className="text-xs mt-1">상단의 &quot;오더 등록&quot; 버튼으로 새 오더를 등록하세요.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        myOrders.map(order => (
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
                                        <p className="text-sm font-medium text-emerald-700 bg-emerald-50 p-2 rounded mb-3">
                                            ✅ 수락 업체: {order.accepted_company.name}
                                        </p>
                                    )}

                                    <div className="flex gap-2">
                                        {order.status === 'accepted' && (!order.address || !order.customer_phone) && (
                                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => openDetailDialog(order)}>
                                                <AlertCircle className="h-4 w-4 mr-1" />
                                                상세 정보 입력
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
                    {incomingOrders.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                <Inbox className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>수신된 오더가 없습니다.</p>
                                <p className="text-xs mt-1">공유 활성화된 업체의 오더가 여기에 표시됩니다.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        incomingOrders.map(order => (
                            <Card key={order.id} className="overflow-hidden border-l-4 border-l-blue-500">
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
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleAccept(order.id)}
                                            disabled={acceptingId === order.id}
                                        >
                                            {acceptingId === order.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                            )}
                                            오더 수락
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
        </div>
    )
}
