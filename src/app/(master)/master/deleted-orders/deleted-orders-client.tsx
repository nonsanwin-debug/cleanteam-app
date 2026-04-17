'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Trash2, Undo2, MapPin, Calendar, User, Building2, Clock, AlertTriangle } from 'lucide-react'
import { restoreDeletedSite } from '@/actions/master'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export function DeletedOrdersClient({ initialSites, initialOrders }: { initialSites: any[], initialOrders: any[] }) {
    const [sites, setSites] = useState(initialSites)
    const [orders] = useState(initialOrders)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'sites' | 'orders'>('orders')
    const [loading, setLoading] = useState<string | null>(null)
    const router = useRouter()

    // 사이트 필터
    const filteredSites = sites.filter(site =>
        site.name?.toLowerCase().includes(search.toLowerCase()) ||
        site.address?.toLowerCase().includes(search.toLowerCase()) ||
        site.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        site.deleted_by_name?.toLowerCase().includes(search.toLowerCase())
    )

    // 오더 필터
    const filteredOrders = orders.filter(order => {
        const pd = order.parsed_details || {}
        const searchTarget = `${order.region} ${order.address} ${order.customer_name} ${pd.deleted_by}`.toLowerCase()
        return searchTarget.includes(search.toLowerCase())
    })

    const handleRestore = async (siteId: string) => {
        if (!confirm('이 현장을 복원하시겠습니까? 업체 현장 목록에 다시 표시됩니다.')) return
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Trash2 className="w-6 h-6 text-red-500" />
                    삭제 오더 관리
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    업체 또는 파트너가 삭제한 현장/오더를 관리합니다. 금액 반환 심사에 활용하세요.
                </p>
            </div>

            {/* 탭 */}
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
                <Input
                    placeholder="주소, 고객명, 삭제자 검색..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* 삭제된 오더 목록 */}
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
                            return (
                                <Card key={order.id} className="border-red-100 bg-red-50/30">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-800">{order.region || order.address || '주소 미상'}</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {order.work_date || '날짜 미정'} · {order.area_size || '면적 미상'}
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
                                                    등록 파트너: <span className="font-semibold">{senderName}</span>
                                                </p>
                                            )}
                                            {acceptedName && (
                                                <p className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    배정 업체: <span className="font-semibold">{acceptedName}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* 견적/금액 정보 */}
                                        {pd.estimated_price && (
                                            <div className="text-sm text-slate-700">
                                                견적: <span className="font-bold">{Number(pd.estimated_price).toLocaleString()}원</span>
                                            </div>
                                        )}

                                        {/* 삭제 정보 */}
                                        <div className="bg-red-100/60 border border-red-200 rounded-lg p-3 space-y-1.5">
                                            <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                삭제 정보
                                            </p>
                                            <div className="text-xs text-red-700 space-y-1">
                                                <p className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3" />
                                                    삭제자: <span className="font-semibold">{pd.deleted_by || '알 수 없음'}</span>
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" />
                                                    삭제일시: {pd.deleted_at ? format(new Date(pd.deleted_at), 'yyyy-MM-dd HH:mm') : '알 수 없음'}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )
            )}

            {/* 삭제된 현장 목록 */}
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
                                                        <Calendar className="w-3 h-3" />
                                                        청소일: {site.cleaning_date}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant="destructive" className="text-xs">삭제됨</Badge>
                                        </div>

                                        <div className="text-sm space-y-1.5 text-slate-600">
                                            {site.address && (
                                                <p className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    {site.address}
                                                </p>
                                            )}
                                            {site.customer_name && (
                                                <p className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    {site.customer_name} {site.customer_phone && `(${site.customer_phone})`}
                                                </p>
                                            )}
                                            {companyName && (
                                                <p className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    배정 업체: <span className="font-semibold">{companyName}</span>
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
                                                <p className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3" />
                                                    삭제자: <span className="font-semibold">{site.deleted_by_name || '알 수 없음'}</span>
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" />
                                                    삭제일시: {site.deleted_at ? format(new Date(site.deleted_at), 'yyyy-MM-dd HH:mm') : '알 수 없음'}
                                                </p>
                                                {site.deleted_by_role && (
                                                    <p className="flex items-center gap-1.5">
                                                        <Building2 className="w-3 h-3" />
                                                        삭제 유형: 
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-red-300 text-red-700">
                                                            {site.deleted_by_role === 'partner' ? '파트너 삭제' : site.deleted_by_role === 'master' ? '마스터 삭제' : '업체 삭제'}
                                                        </Badge>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* 액션 */}
                                        <div className="flex gap-2 pt-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-9 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                                disabled={loading === site.id}
                                                onClick={() => handleRestore(site.id)}
                                            >
                                                <Undo2 className="w-3.5 h-3.5 mr-1" />
                                                {loading === site.id ? '복원 중...' : '현장 복원'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )
            )}

            <p className="text-xs text-center text-slate-400 py-4">
                삭제된 오더 {orders.length}건 · 삭제된 현장 {sites.length}건
            </p>
        </div>
    )
}
