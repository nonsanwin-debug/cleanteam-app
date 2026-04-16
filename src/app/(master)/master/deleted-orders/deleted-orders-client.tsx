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

export function DeletedOrdersClient({ initialSites }: { initialSites: any[] }) {
    const [sites, setSites] = useState(initialSites)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState<string | null>(null)
    const router = useRouter()

    const filtered = sites.filter(site =>
        site.name?.toLowerCase().includes(search.toLowerCase()) ||
        site.address?.toLowerCase().includes(search.toLowerCase()) ||
        site.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        site.deleted_by_name?.toLowerCase().includes(search.toLowerCase())
    )

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
                    업체 또는 파트너가 삭제한 현장을 관리합니다. 금액 반환 심사에 활용하세요.
                </p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="현장명, 주소, 고객명, 삭제자 검색..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">삭제된 오더가 없습니다</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(site => {
                        const companyName = Array.isArray(site.company) ? site.company[0]?.name : site.company?.name
                        return (
                            <Card key={site.id} className="border-red-100 bg-red-50/30">
                                <CardContent className="p-4 space-y-3">
                                    {/* 헤더 */}
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

                                    {/* 현장 정보 */}
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
                                                배정 업체: <span className="font-semibold text-slate-700">{companyName}</span>
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
                                        {/* 금액 정보 */}
                                        {(site.balance_amount > 0 || site.additional_amount > 0) && (
                                            <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-800">
                                                {site.balance_amount > 0 && (
                                                    <p>잔금: <span className="font-bold">{site.balance_amount?.toLocaleString()}원</span></p>
                                                )}
                                                {site.additional_amount > 0 && (
                                                    <p>추가금: <span className="font-bold">{site.additional_amount?.toLocaleString()}원</span></p>
                                                )}
                                            </div>
                                        )}
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
            )}

            <p className="text-xs text-center text-slate-400 py-4">
                총 {filtered.length}건의 삭제된 오더
            </p>
        </div>
    )
}
