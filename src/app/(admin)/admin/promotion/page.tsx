'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { getAdminPortfolio, toggleSitePromotionVisibility } from '@/actions/portfolio'

type PortfolioSite = {
    id: string
    name: string
    address: string
    completed_at: string
    hidden_from_promotion: boolean
    thumbnails?: {
        before: string[]
        after: string[]
        beforeCount: number
        afterCount: number
    }
}

export default function AdminPromotionPage() {
    const [sites, setSites] = useState<PortfolioSite[]>([])
    const [loading, setLoading] = useState(true)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    useEffect(() => {
        loadSites()
    }, [])

    async function loadSites() {
        setLoading(true)
        const data = await getAdminPortfolio()
        setSites(data)
        setLoading(false)
    }

    async function handleToggleVisibility(siteId: string, currentHidden: boolean) {
        setTogglingId(siteId)
        const newHiddenStatus = !currentHidden

        const result = await toggleSitePromotionVisibility(siteId, newHiddenStatus)
        if (result.success) {
            setSites(sites.map(s => s.id === siteId ? { ...s, hidden_from_promotion: newHiddenStatus } : s))
            toast.success(newHiddenStatus ? '포트폴리오에서 숨김 처리되었습니다.' : '포트폴리오에 노출됩니다.')
        } else {
            toast.error(result.error || '상태 변경 중 오류가 발생했습니다.')
        }

        setTogglingId(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">홍보 관리</h1>
                <p className="text-sm text-slate-500 mt-2">
                    최근 한 달간 완료된 현장 중 <strong>홍보 페이지 (포트폴리오)</strong>에 노출될 현장을 관리합니다.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">최근 완료된 작업</CardTitle>
                    <CardDescription>
                        기본적으로 모든 완료 현장이 노출됩니다. 사진이 없거나 노출을 원치 않는 현장은 숨김 처리하세요.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sites.length === 0 ? (
                        <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed">
                            <p className="text-slate-500 font-medium">최근 30일간 완료된 현장이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sites.map(site => (
                                <div
                                    key={site.id}
                                    className={`flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-lg border gap-3 ${site.hidden_from_promotion
                                        ? 'bg-slate-50 border-slate-200 opacity-75'
                                        : 'bg-white border-blue-100 shadow-sm'
                                        }`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                {format(new Date(site.completed_at), 'MM월 dd일')}
                                            </span>
                                            {site.hidden_from_promotion && (
                                                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                                    숨김 상태
                                                </span>
                                            )}
                                        </div>
                                        <p className={`font-bold ${site.hidden_from_promotion ? 'text-slate-600' : 'text-slate-900'}`}>
                                            {site.name}
                                        </p>
                                        <p className="text-sm text-slate-500 truncate max-w-[200px] md:max-w-none">
                                            {site.address}
                                        </p>

                                        {/* Thumbnails */}
                                        {site.thumbnails && (
                                            <div className="flex flex-col gap-2 mt-3">
                                                <div className="flex bg-slate-50 p-2 rounded-lg border border-slate-100 items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-xs text-center font-bold px-2 py-1 rounded w-14 ${site.thumbnails.beforeCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                                                            전 ({site.thumbnails.beforeCount})
                                                        </span>
                                                        <div className="flex gap-1.5">
                                                            {site.thumbnails.before.map((url, i) => (
                                                                <div key={`before-${i}`} className={`w-9 h-9 rounded bg-slate-200 overflow-hidden border border-slate-300 ${site.hidden_from_promotion ? 'opacity-50 grayscale' : ''}`}>
                                                                    <img src={url} alt="before" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-xs text-center font-bold px-2 py-1 rounded w-14 ${site.thumbnails.afterCount > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                                            후 ({site.thumbnails.afterCount})
                                                        </span>
                                                        <div className="flex gap-1.5">
                                                            {site.thumbnails.after.map((url, i) => (
                                                                <div key={`after-${i}`} className={`w-9 h-9 rounded bg-slate-200 overflow-hidden border border-slate-300 ${site.hidden_from_promotion ? 'opacity-50 grayscale' : ''}`}>
                                                                    <img src={url} alt="after" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 md:ml-4">
                                        <Button
                                            variant={site.hidden_from_promotion ? "outline" : "destructive"}
                                            size="sm"
                                            onClick={() => handleToggleVisibility(site.id, site.hidden_from_promotion)}
                                            disabled={togglingId === site.id}
                                            className={`w-full md:w-auto ${site.hidden_from_promotion ? '' : 'bg-red-500 hover:bg-red-600'}`}
                                        >
                                            {togglingId === site.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : site.hidden_from_promotion ? (
                                                <>
                                                    <Eye className="w-4 h-4 mr-1.5" />
                                                    다시 노출
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="w-4 h-4 mr-1.5" />
                                                    숨기기
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
