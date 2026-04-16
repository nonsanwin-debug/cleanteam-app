'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MapPin, Calendar, Clock, Phone, User, CheckCircle2, Inbox, Trash2, Loader2, Share2, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { deleteSharedOrderForce, releaseToSharedBoard, assignCustomerOrder } from '@/actions/master'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function MasterOrdersClient({ initialOrders }: { initialOrders: any[] }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [orders, setOrders] = useState(initialOrders)
    const [companies, setCompanies] = useState<any[]>([])
    const [assigningId, setAssigningId] = useState<string | null>(null)
    const [releasingId, setReleasingId] = useState<string | null>(null)
    const [selectedCompany, setSelectedCompany] = useState<Record<string, string>>({})

    useEffect(() => {
        const loadCompanies = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('companies')
                .select('id, name, users(role)')
                .eq('status', 'approved')
                .order('name')
            // 파트너 업체 제외 (유저 중 role='partner'가 있으면 파트너 업체)
            const cleaningCompanies = (data || []).filter((c: any) => {
                if (c.users && c.users.length > 0) {
                    return !c.users.some((u: any) => u.role === 'partner')
                }
                return true
            })
            setCompanies(cleaningCompanies)
        }
        loadCompanies()
    }, [])

    const filteredOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase()
        return (
            order.region?.toLowerCase().includes(term) ||
            order.address?.toLowerCase().includes(term) ||
            order.customer_name?.toLowerCase().includes(term) ||
            order.customer_phone?.toLowerCase().includes(term) ||
            order.company?.name?.toLowerCase().includes(term) ||
            order.accepted_company?.name?.toLowerCase().includes(term)
        )
    })

    const handleDelete = async (orderId: string) => {
        if (!confirm('이 오더를 영구적으로 삭제하시겠습니까? 관련 알림 및 접수 내역 전체가 사라집니다.')) return

        setIsDeleting(orderId)
        try {
            const result = await deleteSharedOrderForce(orderId)
            if (result.success) {
                toast.success('오더가 성공적으로 삭제되었습니다.')
                setOrders(orders.filter(o => o.id !== orderId))
                router.refresh()
            } else {
                toast.error(result.error || '삭제 중 오류가 발생했습니다.')
            }
        } catch (error) {
            toast.error('서버와의 통신에 실패했습니다.')
        } finally {
            setIsDeleting(null)
        }
    }

    const handleRelease = async (orderId: string) => {
        if (!confirm('이 오더를 공유 오더 게시판으로 내리시겠습니까?')) return
        setReleasingId(orderId)
        const result = await releaseToSharedBoard(orderId)
        if (result.success) {
            toast.success('공유 오더 게시판에 등록되었습니다.')
            setOrders(orders.map(o => o.id === orderId ? { ...o, parsed_details: { ...o.parsed_details, pending_master: false } } : o))
            router.refresh()
        } else {
            toast.error(result.error || '처리 실패')
        }
        setReleasingId(null)
    }

    const handleAssign = async (orderId: string) => {
        const companyId = selectedCompany[orderId]
        if (!companyId) { toast.error('업체를 선택해주세요.'); return }
        if (!confirm('선택한 업체에 직접 배정하시겠습니까?')) return
        setAssigningId(orderId)
        const result = await assignCustomerOrder(orderId, companyId)
        if (result.success) {
            const company = companies.find(c => c.id === companyId)
            toast.success(`${company?.name || '업체'}에 배정되었습니다.`)
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'transferred', accepted_by: companyId, parsed_details: { ...o.parsed_details, pending_master: false } } : o))
            router.refresh()
        } else {
            toast.error(result.error || '배정 실패')
        }
        setAssigningId(null)
    }

    const getStatusBadge = (status: string, isAutoAssign: boolean = false, parsedDetails: any = {}) => {
        if (parsedDetails?.pending_master && status === 'open') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 animate-pulse">⚡ 고객링크 접수 (마스터 확인 대기)</Badge>
        if (status === 'open') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">대기중 (배정전)</Badge>
        if (status === 'accepted') return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">수락됨 (상세정보 대기)</Badge>
        if (status === 'transferred') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">이관 완료{isAutoAssign ? ' [AI자동]' : ''}</Badge>
        if (status === 'completed') return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">작업 완료</Badge>
        if (status === 'cancelled') return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">취소됨</Badge>
        return <Badge variant="outline">{status}</Badge>
    }

    return (
        <div className="space-y-4">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="지역, 고객명, 연락처, 업체명 검색..."
                    className="pl-9 border-slate-200 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredOrders.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center">
                        <Inbox className="h-10 w-10 mb-3 text-slate-300" />
                        <p>조회된 오더 내역이 없습니다.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map(order => (
                        <Card key={order.id} className="overflow-hidden border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all">
                            <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100 relative pr-12">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute right-2 top-3 text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                    onClick={() => handleDelete(order.id)}
                                    disabled={isDeleting === order.id}
                                >
                                    {isDeleting === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Badge variant="outline" className="w-fit text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
                                            발신: {order.company?.name || '알 수 없는 파트너'}
                                        </Badge>
                                        <CardTitle className="text-lg mt-1 font-bold truncate pr-3">{order.region}</CardTitle>
                                    </div>
                                    <div className="shrink-0 mt-2">
                                        {getStatusBadge(order.status, order.is_auto_assign, order.parsed_details)}
                                    </div>
                                </div>
                                <CardDescription className="flex items-center gap-1.5 mt-2">
                                    <span className="text-xs text-slate-500 font-medium">
                                        등록일시: {format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}
                                    </span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {/* 배정 정보 바 */}
                                {order.accepted_by && (
                                    <div className="bg-emerald-50 text-emerald-800 text-sm p-2.5 rounded-md font-medium flex items-center justify-between border border-emerald-100">
                                        <span className="flex items-center gap-1.5 text-xs font-bold">
                                            <CheckCircle2 className="w-4 h-4" />
                                            배정 완료
                                        </span>
                                        <span>{order.accepted_company?.name || '업체명 미상'}</span>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="col-span-2 flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <span className="text-slate-700 font-medium">{order.address || '주소 미등록'} {order.detail_address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-slate-700">{order.work_date || '일정 미정'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-slate-700 truncate">{order.customer_name || '고객명 미상'}</span>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-slate-700 font-mono tracking-tight">{order.customer_phone || '연락처 없음'}</span>
                                    </div>
                                </div>

                                {order.notes && (
                                    <div className="mt-3 bg-slate-50 p-2.5 rounded text-xs text-slate-600 whitespace-pre-wrap border border-slate-100 max-h-[120px] overflow-y-auto">
                                        {order.notes}
                                    </div>
                                )}

                                {/* 고객 링크 접수 — 마스터 액션 버튼 */}
                                {order.parsed_details?.pending_master && order.status === 'open' && (
                                    <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5" />
                                                업체 직접 배정
                                            </p>
                                            <div className="flex gap-2">
                                                <select
                                                    className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                                                    value={selectedCompany[order.id] || ''}
                                                    onChange={e => setSelectedCompany(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                >
                                                    <option value="">업체 선택...</option>
                                                    {companies.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <Button
                                                    size="sm"
                                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 px-3"
                                                    onClick={() => handleAssign(order.id)}
                                                    disabled={assigningId === order.id || !selectedCompany[order.id]}
                                                >
                                                    {assigningId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '배정'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full h-10 text-sm font-semibold border-blue-300 text-blue-700 hover:bg-blue-50"
                                            onClick={() => handleRelease(order.id)}
                                            disabled={releasingId === order.id}
                                        >
                                            {releasingId === order.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Share2 className="w-4 h-4 mr-2" />
                                            )}
                                            공유 오더 게시판으로 내리기
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
