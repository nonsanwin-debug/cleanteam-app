'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CheckCircle2, Clock, CheckSquare, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { confirmOrderAssignee, deleteSharedOrder, updateSharedOrder } from '@/actions/shared-orders'
import { toast } from 'sonner'
import { Loader2, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'

export function FieldOrdersClient({ initialOrders }: { initialOrders: any[] }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'done'>('all')
    const [confirmingId, setConfirmingId] = useState<string | null>(null)

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel('partner-orders-refresh')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shared_orders' },
                () => { router.refresh() }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shared_order_applicants' },
                () => { router.refresh() }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router])

    // Edit and Delete States
    const [editingOrder, setEditingOrder] = useState<any | null>(null)
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)
    const [isMutating, setIsMutating] = useState(false)

    // Form states
    const [editForm, setEditForm] = useState({ region: '', address: '', work_date: '', area_size: '', notes: '' })

    const getPricePerPyeong = (type: string) => {
        if (type === '입주청소' || type === '이사청소') return 12000
        if (type === '거주청소') return 13000
        if (type === '사이청소') return 15000
        return 12000
    }

    const handleAreaSizeChange = (newValue: string) => {
        const onlyNumbers = newValue.replace(/[^0-9]/g, '')
        const newAreaSize = onlyNumbers ? `${onlyNumbers}평` : ''
        
        const currentNotes = editForm.notes || ''
        const typeMatch = currentNotes.match(/\[요청타입\]\s*(.+?)\n/)
        const cleanType = typeMatch ? typeMatch[1].trim() : ''

        const conditionMatch = currentNotes.match(/\[건물상태\]\s*(.+?)\n/)
        const conditionText = conditionMatch ? conditionMatch[1].trim() : ''
        const conditionAddPerPyeong = conditionText === '구축' ? 2000 : (conditionText === '인테리어' ? 3000 : 0)

        const baseShortRegion = editForm.region.replace(/ \d+평.*?$/, '')
        
        let priceString = ''
        if (cleanType && (cleanType === '상가청소' || cleanType === '특수청소')) {
            priceString = '협의'
        } else if (cleanType && onlyNumbers) {
            const parsedArea = parseInt(onlyNumbers, 10) || 0
            const pricePerPyeong = getPricePerPyeong(cleanType)
            let calculatedPrice = parsedArea * (pricePerPyeong + conditionAddPerPyeong)
            if (calculatedPrice > 0 && calculatedPrice < 150000) {
                calculatedPrice = 150000
            }
            if (calculatedPrice > 0) {
                priceString = `${calculatedPrice / 10000}만원`
            }
        }

        const newRegion = baseShortRegion + (newAreaSize ? ` ${newAreaSize} ${priceString}`.trimEnd() : '')

        setEditForm({
            ...editForm,
            area_size: newAreaSize,
            region: newRegion
        })
    }

    const handleEditClick = (order: any) => {
        setEditForm({
            region: order.region || '',
            address: order.address || '',
            work_date: order.work_date || '',
            area_size: order.area_size || '',
            notes: order.notes || ''
        })
        setEditingOrder(order)
    }

    const handleEditSubmit = async () => {
        if (!editingOrder) return
        setIsMutating(true)
        const res = await updateSharedOrder(editingOrder.id, {
            ...editForm,
            customer_name: editingOrder.customer_name,
            customer_phone: editingOrder.customer_phone
        })
        if (res.success) {
            toast.success('오더 정보가 수정되었습니다.')
            setEditingOrder(null)
            router.refresh()
        } else {
            toast.error(res.error || '수정에 실패했습니다.')
        }
        setIsMutating(false)
    }

    const handleDeleteSubmit = async () => {
        if (!deletingOrderId) return
        setIsMutating(true)
        const res = await deleteSharedOrder(deletingOrderId)
        if (res.success) {
            toast.success('오더가 성공적으로 삭제되었습니다.')
            setDeletingOrderId(null)
            router.refresh()
        } else {
            toast.error(res.error || '삭제에 실패했습니다.')
        }
        setIsMutating(false)
    }

    const filteredOrders = initialOrders.filter(order => {
        // Tab Filter
        let isMatchTab = true
        const isDone = order.status === 'transferred' && order.transferred_site?.status === 'completed'
        
        if (activeTab === 'ongoing') isMatchTab = !isDone
        if (activeTab === 'done') isMatchTab = isDone

        // Search Filter
        const searchTarget = `${order.region} ${order.address} ${order.work_date}`.toLowerCase()
        const isMatchSearch = searchTarget.includes(searchTerm.toLowerCase())

        return isMatchTab && isMatchSearch
    })

    return (
        <div className="flex flex-col min-h-screen pb-20 bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between">
                <div className="font-bold text-slate-800 text-lg">내 오더 관리</div>
            </header>

            <main className="flex-1 p-4 space-y-4">
                
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input 
                        placeholder="주소나 날짜로 검색" 
                        className="pl-10 h-12 bg-white rounded-xl shadow-sm border-transparent focus:border-teal-500 text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                    {['all', 'ongoing', 'done'].map((tab) => (
                        <button
                            key={tab}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                                activeTab === tab 
                                    ? 'bg-white text-teal-700 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            onClick={() => setActiveTab(tab as any)}
                        >
                            {tab === 'all' && '전체 목록'}
                            {tab === 'ongoing' && '진행 중'}
                            {tab === 'done' && '완료됨'}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="space-y-3 pt-2">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">조건에 맞는 오더가 없습니다.</p>
                        </div>
                    ) : (
                        filteredOrders.map(order => {
                            let statusText = '대기중'
                            let statusColor = 'bg-blue-100 text-blue-700'
                            let Icon = Clock
                            let isDone = false
                            
                            if (order.status === 'accepted') {
                                statusText = order.accepted_company?.name ? `${order.accepted_company.name} 확정` : '업체 확정됨'
                                statusColor = 'bg-orange-100 text-orange-700'
                            } else if (order.status === 'open' && order.applicants && order.applicants.length > 0) {
                                statusText = order.applicants.length === 1 
                                    ? `${order.applicants[0].name} 요청` 
                                    : `${order.applicants[0].name} 외 ${order.applicants.length - 1}건`
                                statusColor = 'bg-orange-100 text-orange-700'
                            } else if (order.status === 'transferred') {
                                if (order.transferred_site?.status === 'completed') {
                                    statusText = '작업 완료'
                                    statusColor = 'bg-slate-100 text-slate-600'
                                    Icon = CheckCircle2
                                    isDone = true
                                } else if (order.transferred_site?.status === 'in_progress') {
                                    statusText = '현장 진행 중'
                                    statusColor = 'bg-teal-100 text-teal-700'
                                    Icon = Clock
                                } else if (order.transferred_site?.status === 'scheduled') {
                                    statusText = '배정 완료 (대기중)'
                                    statusColor = 'bg-blue-100 text-blue-700'
                                    Icon = Clock
                                } else {
                                    statusText = '이관 완료'
                                    statusColor = 'bg-teal-100 text-teal-700'
                                    Icon = Clock
                                }
                            }
                            
                            return (
                                <Card key={order.id} className={`overflow-hidden transition-all ${isDone ? 'opacity-70' : ''}`}>
                                    <CardContent className="p-0">
                                        <div className="p-4 border-b border-slate-50 flex justify-between items-start w-full">
                                            <div className="flex-1 pr-4">
                                                <Badge className={`mb-2 font-medium shadow-none ${statusColor}`}>
                                                    <Icon className="w-3 h-3 mr-1" /> {statusText}
                                                </Badge>
                                                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">
                                                    {order.address || order.region}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    {order.work_date || '날짜 미정'} · {order.area_size}
                                                </p>
                                            </div>
                                            <div className="text-right whitespace-nowrap">
                                                <span className={cn("text-sm font-semibold px-2 py-1 rounded-lg", statusColor)}>
                                                    {statusText}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Edit / Delete Actions (if not done) */}
                                        {!isDone && (
                                            <div className="flex gap-2 justify-end px-4 pt-2 -mb-2 relative z-10 block">
                                                {order.status !== 'transferred' && (
                                                    <button onClick={() => handleEditClick(order)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-colors cursor-pointer">
                                                        <Edit className="w-3.5 h-3.5 mr-1" /> 수정
                                                    </button>
                                                )}
                                                <button onClick={() => setDeletingOrderId(order.id)} className="text-xs text-red-600 hover:text-red-800 flex items-center bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 transition-colors cursor-pointer">
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> 삭제
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* 배정 요청 업체 리스트 (대기중일 때만) */}
                                        {order.status === 'open' && order.applicants && order.applicants.length > 0 && (
                                            <div className="bg-orange-50/50 px-4 py-3 border-b border-orange-100">
                                                <p className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-1.5">
                                                    🤝 {order.applicants.length}개의 업체가 배정을 대기 중입니다!
                                                </p>
                                                <div className="space-y-2">
                                                    {order.applicants.map((app: any) => (
                                                        <div key={app.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-orange-200 shadow-sm">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-800 text-sm">{app.name}</span>
                                                            </div>
                                                            <button
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                                    confirmingId === app.id
                                                                        ? "bg-slate-200 text-slate-500"
                                                                        : "bg-orange-500 text-white hover:bg-orange-600 shadow-sm cursor-pointer"
                                                                )}
                                                                disabled={!!confirmingId}
                                                                onClick={async () => {
                                                                    setConfirmingId(app.id)
                                                                    const res = await confirmOrderAssignee(order.id, app.id)
                                                                    if (res.success) {
                                                                        toast.success(`${app.name} 업체로 확정되었습니다!`)
                                                                        router.refresh()
                                                                    } else {
                                                                        toast.error(res.error || '업체 확정에 실패했습니다.')
                                                                    }
                                                                    setConfirmingId(null)
                                                                }}
                                                            >
                                                                {confirmingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '업체 확정'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Footer */}
                                        <div className="bg-slate-50 px-4 py-3 flex justify-between items-center text-xs text-slate-500">
                                            <span>제출일: {format(new Date(order.created_at), 'yyyy-MM-dd')}</span>
                                            {order.accepted_company && (
                                                <span className="font-medium flex items-center">
                                                    담당: {order.accepted_company.name}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>

            </main>

            {/* Edit Dialog */}
            <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
                <DialogContent className="sm:max-w-md w-[95%]">
                    <DialogHeader>
                        <DialogTitle>오더 수정</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>지역 (예: 서울 강남구)</Label>
                            <Input value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>상세 주소 (선택)</Label>
                            <Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>희망일 (선택)</Label>
                                <Input type="date" value={editForm.work_date} onChange={e => setEditForm({ ...editForm, work_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>평수 (선택)</Label>
                                <Input 
                                    placeholder="예: 32" 
                                    value={editForm.area_size} 
                                    onChange={e => handleAreaSizeChange(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>요청 사항</Label>
                            <textarea 
                                className="w-full min-h-[120px] p-3 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-50 border-input"
                                value={editForm.notes} 
                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })} 
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                        <button 
                            className="bg-teal-600 text-white font-bold py-2.5 px-4 rounded-xl flex-1 flex justify-center w-full"
                            onClick={handleEditSubmit}
                            disabled={isMutating}
                        >
                            {isMutating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '수정 완료'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={!!deletingOrderId} onOpenChange={(open) => !open && setDeletingOrderId(null)}>
                <AlertDialogContent className="w-[90%] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>오더를 정말 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 오더를 삭제하면 관련 정보 (배정 요청 포함) 가 모두 삭제되며 복구할 수 없습니다. 계속하시겠습니까?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isMutating}>취소</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteSubmit}
                            className="bg-red-500 hover:bg-red-600 font-bold"
                            disabled={isMutating}
                        >
                            {isMutating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            삭제하기
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
