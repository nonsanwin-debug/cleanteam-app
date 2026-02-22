'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Building2, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { getAllCompanies, toggleCompanySharing } from '@/actions/shared-orders'

export default function PartnersPage() {
    const [companies, setCompanies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    useEffect(() => {
        loadCompanies()
    }, [])

    async function loadCompanies() {
        const data = await getAllCompanies()
        setCompanies(data)
        setLoading(false)
    }

    async function handleToggle(companyId: string, enabled: boolean) {
        setTogglingId(companyId)
        const result = await toggleCompanySharing(companyId, enabled)
        if (result.success) {
            setCompanies(prev =>
                prev.map(c => c.id === companyId ? { ...c, sharing_enabled: enabled } : c)
            )
            toast.success(enabled ? '공유 활성화됨' : '공유 비활성화됨')
        } else {
            toast.error(result.error)
        }
        setTogglingId(null)
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight flex items-center">
                    <Building2 className="mr-2" />
                    업체 권한 관리
                </h2>
                <div className="flex items-center justify-center p-10">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center">
                    <Building2 className="mr-2" />
                    업체 권한 관리
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    오더 공유 시스템에 참여할 업체를 설정합니다.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <Share2 className="h-5 w-5 mr-2" />
                        업체 목록
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {companies.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            등록된 업체가 없습니다.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {companies.map((company) => (
                                <div key={company.id} className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                            {(company.name || '?')[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{company.name}</p>
                                            <p className="text-xs text-slate-400">ID: {company.id.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {company.sharing_enabled ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">공유 활성</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-400">비활성</Badge>
                                        )}
                                        <Switch
                                            checked={company.sharing_enabled || false}
                                            onCheckedChange={(checked) => handleToggle(company.id, checked)}
                                            disabled={togglingId === company.id}
                                        />
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
