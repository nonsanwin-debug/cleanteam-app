'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, User, AlertTriangle } from 'lucide-react'

export default function ASSharePage({ params }: { params: Promise<{ id: string }> }) {
    const [asRequest, setAsRequest] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [resolvedId, setResolvedId] = useState<string>('')

    useEffect(() => {
        params.then(p => {
            setResolvedId(p.id)
        })
    }, [params])

    useEffect(() => {
        if (!resolvedId) return

        async function fetchData() {
            try {
                const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )

                const { data, error: fetchError } = await supabase
                    .from('as_requests')
                    .select(`
                        *,
                        site:sites!site_id (name, address),
                        worker:users!worker_id (name, phone)
                    `)
                    .eq('id', resolvedId)
                    .single()

                if (fetchError) throw fetchError
                setAsRequest(data)
            } catch (err: any) {
                console.error(err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [resolvedId])

    if (loading) return <div className="p-8 text-center bg-slate-50 min-h-screen">Loading...</div>

    if (error || !asRequest) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center space-y-2">
                    <h1 className="text-xl font-bold text-slate-900">유효하지 않은 링크입니다</h1>
                    <p className="text-slate-500">존재하지 않는 AS 내역이거나 삭제된 링크일 수 있습니다.</p>
                </div>
            </div>
        )
    }

    const statusInfoMap: Record<string, { label: string; color: string }> = {
        pending: { label: '접수/대기', color: 'bg-red-100 text-red-700' },
        monitoring: { label: '처리 중', color: 'bg-yellow-100 text-yellow-700' },
        resolved: { label: '처리 완료', color: 'bg-green-100 text-green-700' },
    }
    const statusInfo = statusInfoMap[asRequest.status as string] || { label: asRequest.status, color: 'bg-slate-100 text-slate-700' }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-center relative">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <h1 className="font-bold text-lg truncate">AS 처리 현황</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-4">
                {/* Status */}
                <div className="text-center py-4">
                    <Badge className={`${statusInfo.color} text-sm px-4 py-1`}>
                        {statusInfo.label}
                    </Badge>
                </div>

                {/* Site Info */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-500" />
                            현장 정보
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <div className="font-semibold text-base">
                            {asRequest.site?.name || asRequest.site_name}
                        </div>
                        {asRequest.site?.address && (
                            <div className="text-slate-600">{asRequest.site.address}</div>
                        )}
                        <div className="flex items-center gap-2 text-slate-600">
                            <CalendarDays className="h-4 w-4" />
                            <span>발생일: {asRequest.occurred_at}</span>
                        </div>
                        {asRequest.worker?.name && (
                            <div className="flex items-center gap-2 text-slate-600">
                                <User className="h-4 w-4" />
                                <span>담당: {asRequest.worker.name}</span>
                                {asRequest.worker?.phone && (
                                    <a href={`tel:${asRequest.worker.phone}`}
                                        className="ml-2 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium border border-blue-200">
                                        전화하기
                                    </a>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* AS Description */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">AS 내용</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{asRequest.description}</p>
                    </CardContent>
                </Card>

                {/* Processing Details */}
                {asRequest.processing_details && (
                    <Card className="border-none shadow-sm border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">처리 결과</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{asRequest.processing_details}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Photos */}
                {asRequest.photos && asRequest.photos.length > 0 && (
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">AS 사진</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-2">
                                {asRequest.photos.map((url: string, idx: number) => (
                                    <img key={idx} src={url} alt={`AS 사진 ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Footer */}
                <div className="text-center py-6 text-xs text-slate-400">
                    <p>Clean Team</p>
                </div>
            </main>
        </div>
    )
}
