'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Trash2, Undo2, MapPin, Calendar, User, Building2, Clock, AlertTriangle, Coins, CheckCircle2 } from 'lucide-react'
import { restoreDeletedSite, refundCommission } from '@/actions/master'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

function calcCommission(order: any) {
    const pd = order.parsed_details || {}
    let price = pd.estimated_price || 0

    // region에서 가격 추출
    if (!price && order.region) {
        const manwonMatch = order.region.match(/([\d.]+)만원/)
        if (manwonMatch?.[1]) price = Math.floor(parseFloat(manwonMatch[1]) * 10000)
        else {
            const wonMatch = order.region.match(/([\d,]+)원/)
            if (wonMatch?.[1]) price = parseInt(wonMatch[1].replace(/,/g, ''), 10)
        }
    }
    if (!price) price = order.total_price || 0

    const isDiscount = pd.reward_type === 'discount'
    const rate20 = Math.floor(price * 0.2)
    const rate10 = Math.round(price / 9)
    const actualDeducted = isDiscount ? rate10 : rate20

    return { price, rate10, rate20, actualDeducted, isDiscount }
}

export function DeletedOrdersClient({ initialSites, initialOrders }: { initialSites: any[], initialOrders: any[] }) {
    const [sites, setSites] = useState(initialSites)
    const [orders, setOrders] = useState(initialOrders)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'orders' | 'sites'>('orders')
    const [loading, setLoading] = useState<string | null>(null)
    const router = useRouter()

    const filteredSites = sites.filter(site =>
        site.name?.toLowerCase().includes(search.toLowerCase()) ||
        site.address?.toLowerCase().includes(search.toLowerCase()) ||
        site.deleted_by_name?.toLowerCase().includes(search.toLowerCase())
    )

    const filteredOrders = orders.filter(order => {
        const pd = order.parsed_details || {}
        const searchTarget = `${order.region} ${order.address} ${order.customer_name} ${pd.deleted_by}`.toLowerCase()
        return searchTarget.includes(search.toLowerCase())
    })

    const handleRestore = async (siteId: string) => {
        if (!confirm('이 현장을 복원하시겠습니까?')) return
        setLoading(siteId)
        const result = await restoreDeletedSite(siteId)
        setLoading(null)
        if (result.success) {
            setSites(prev => prev.filter(s => s.id !== siteId))
            toast.success('현장이 복원되었습니다')
            router.refresh()
        } else {
            toast.error(result.error || '복원 실패')
        }
    }

    const handleRefund = async (order: any, amount: number, rateLabel: string) => {
        const companyId = order.accepted_by
        if (!companyId) {
            toast.error('배정된 업체가 없어 환불할 수 없습니다.')
            return
        }
        const acceptedName = Array.isArray(order.accepted_company) ? order.accepted_company[0]?.name : order.accepted_company?.name
        if (!confirm(`${acceptedName || '업체'}에게 ${amount.toLocaleString()}원 (${rateLabel})을 환불하시겠습니까?`)) return

        setLoading(order.id + rateLabel)
        const result = await refundCommission(order.id, companyId, amount, rateLabel)
        setLoading(null)
        if (result.success) {
            toast.success(`${amount.toLocaleString()}원 환불 완료`)
            // 로컬 상태 업데이트
            setOrders(prev => prev.map(o => o.id === order.id ? {
                ...o,
                parsed_details: { ...(o.parsed_details || {}), refunded: true, refunded_amount: amount, refunded_rate: rateLabel }
            } : o))
            router.refresh()
        } else {
            toast.error(result.error || '환불 실패')
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Trash2 className="w-6 h-6 text-red-500" />
                    삭제 오더 관리
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    삭제된 오더/현장의 수수료 환불을 관리합니다.
                </p>
            </div>

            <div className="flex bg-slate-200/50 p-1 rounded-xl">
                <button
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'orders' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500'}`}
                    onClick={() => setActiveTab('orders')}
                >
                    삭제된 오더 ({orders.length})
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'sites' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500'}`}
                    onClick={() => setActiveTab('sites')}
                >
                    삭제된 현장 ({sites.length})
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="주소, 고객명, 삭제자 검색..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>

            {/* 삭제된 오더 */}
            {activeTab === 'orders' && (
                filteredOrders.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">삭제된 오더가 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredOrders.map(order => {
                            const pd = order.parsed_details || {}
                            const senderName = Array.isArray(order.sender_company) ? order.sender_company[0]?.name : order.sender_company?.name
                            const acceptedName = Array.isArray(order.accepted_company) ? order.accepted_company[0]?.name : order.accepted_company?.name
                            const { price, rate10, rate20, actualDeducted, isDiscount } = calcCommission(order)
                            const isRefunded = pd.refunded === true

                            return (
                                <Card key={order.id} className="border-red-100 bg-red-50/30">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-800">{order.region || order.address || '주소 미상'}</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {order.work_date || '날짜 미정'} · {order.area_size || ''}
                                                </p>
                                            </div>
                                            <Badge variant="destructive" className="text-xs">삭제됨</Badge>
                                        </div>

                                        <div className="text-sm space-y-1.5 text-slate-600">
                                            {order.customer_name && (
                                                <p className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    {order.customer_name} {order.customer_phone && `(${order.customer_phone})`}
                                                </p>
                                            )}
                                            {senderName && (
                                                <p className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    등록: <span className="font-semibold">{senderName}</span>
                                                </p>
                                            )}
                                            {acceptedName && (
                                                <p className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                                    배정업체: <span className="font-semibold text-slate-800">{acceptedName}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* 삭제 정보 */}
                                        <div className="bg-red-100/60 border border-red-200 rounded-lg p-3 space-y-1.5">
                                            <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                삭제 정보
                                            </p>
                                            <div className="text-xs text-red-700 space-y-1">
                                                <p>삭제자: <span className="font-semibold">{pd.deleted_by || '알 수 없음'}</span></p>
                                                <p>삭제일: {pd.deleted_at ? format(new Date(pd.deleted_at), 'yyyy-MM-dd HH:mm') : '알 수 없음'}</p>
                                            </div>
                                        </div>

                                        {/* 수수료 정보 */}
                                        {price > 0 && order.accepted_by && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                                                <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
                                                    <Coins className="w-3.5 h-3.5" />
                                                    수수료 정보
                                                </p>
                                                <div className="text-xs text-amber-700 space-y-1">
                                                    <p>견적 금액: <span className="font-bold text-slate-800">{price.toLocaleString()}원</span></p>
                                                    <p>
                                                        차감 수수료: <span className="font-bold text-red-700">{actualDeducted.toLocaleString()}원</span>
                                                        <span className="ml-1 text-amber-600">({isDiscount ? '10% 할인적용' : '20%'})</span>
                                                    </p>
                                                </div>

                                                {isRefunded ? (
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                        <span className="text-xs font-bold text-emerald-700">
                                                            환불 완료: {pd.refunded_amount?.toLocaleString()}원 ({pd.refunded_rate})
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 pt-1">
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                                            disabled={loading === order.id + '10%'}
                                                            onClick={() => handleRefund(order, rate10, '10%')}
                                                        >
                                                            {loading === order.id + '10%' ? '처리중...' : `10% ${rate10.toLocaleString()}원 지급`}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                                            disabled={loading === order.id + '20%'}
                                                            onClick={() => handleRefund(order, rate20, '20%')}
                                                        >
                                                            {loading === order.id + '20%' ? '처리중...' : `20% ${rate20.toLocaleString()}원 지급`}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )
            )}

            {/* 삭제된 현장 */}
            {activeTab === 'sites' && (
                filteredSites.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">삭제된 현장이 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredSites.map(site => {
                            const companyName = Array.isArray(site.company) ? site.company[0]?.name : site.company?.name
                            return (
                                <Card key={site.id} className="border-red-100 bg-red-50/30">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-800">{site.name}</h3>
                                                {site.cleaning_date && (
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" /> {site.cleaning_date}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant="destructive" className="text-xs">삭제됨</Badge>
                                        </div>

                                        <div className="text-sm space-y-1.5 text-slate-600">
                                            {site.address && (
                                                <p className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {site.address}
                                                </p>
                                            )}
                                            {companyName && (
                                                <p className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    배정 업체: <span className="font-semibold">{companyName}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="bg-red-100/60 border border-red-200 rounded-lg p-3 space-y-1">
                                            <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> 삭제 정보
                                            </p>
                                            <p className="text-xs text-red-700">삭제자: <span className="font-semibold">{site.deleted_by_name || '알 수 없음'}</span></p>
                                            <p className="text-xs text-red-700">삭제일: {site.deleted_at ? format(new Date(site.deleted_at), 'yyyy-MM-dd HH:mm') : '알 수 없음'}</p>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full h-9 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                            disabled={loading === site.id}
                                            onClick={() => handleRestore(site.id)}
                                        >
                                            <Undo2 className="w-3.5 h-3.5 mr-1" />
                                            {loading === site.id ? '복원 중...' : '현장 복원'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )
            )}

            <p className="text-xs text-center text-slate-400 py-4">
                오더 {orders.length}건 · 현장 {sites.length}건
            </p>
        </div>
    )
}
