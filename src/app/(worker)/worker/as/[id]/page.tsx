'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getASRequestById, updateASRequest } from '@/actions/as-manage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2, MapPin, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

export default function WorkerASDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [asRequest, setAsRequest] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [completing, setCompleting] = useState(false)

    useEffect(() => {
        async function load() {
            const data = await getASRequestById(params.id as string)
            setAsRequest(data)
            setLoading(false)
        }
        load()
    }, [params.id])

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    }

    if (!asRequest) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center space-y-2">
                    <p className="text-slate-500">AS 내역을 찾을 수 없습니다.</p>
                    <Button variant="outline" onClick={() => router.back()}>돌아가기</Button>
                </div>
            </div>
        )
    }

    async function handleComplete() {
        if (!confirm('AS 작업을 완료 처리하시겠습니까?')) return
        setCompleting(true)
        try {
            const res = await updateASRequest(asRequest.id, {
                description: asRequest.description,
                processing_details: asRequest.processing_details || '',
                status: 'resolved',
                resolved_at: new Date().toISOString(),
            })
            if (res.success) {
                toast.success('AS 작업이 완료 처리되었습니다.')
                setAsRequest({ ...asRequest, status: 'resolved' })
            } else {
                toast.error('처리 실패: ' + res.error)
            }
        } catch {
            toast.error('오류가 발생했습니다.')
        } finally {
            setCompleting(false)
        }
    }

    const statusMap: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline'; className: string }> = {
        pending: { label: '접수/대기', variant: 'destructive', className: '' },
        monitoring: { label: '모니터링', variant: 'secondary', className: '' },
        resolved: { label: '처리 완료', variant: 'outline', className: 'border-green-500 text-green-600 bg-green-50' },
    }
    const statusBadge = statusMap[asRequest.status as string] || { label: asRequest.status, variant: 'outline' as const, className: '' }

    return (
        <div className="space-y-4 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    AS 상세
                </h2>
            </div>

            {/* Status & Site Info */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">
                            {asRequest.site?.name || asRequest.site_name}
                        </CardTitle>
                        <Badge variant={statusBadge.variant} className={statusBadge.className}>
                            {statusBadge.label}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {asRequest.site?.address && (
                        <div className="flex items-start gap-2 text-slate-600">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{asRequest.site.address}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                        <CalendarDays className="h-4 w-4" />
                        <span>발생일: {asRequest.occurred_at}</span>
                    </div>
                    {asRequest.worker?.name && (
                        <div className="text-slate-600">
                            담당 팀장: <span className="font-semibold">{asRequest.worker.name}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AS Content */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">AS 내용</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{asRequest.description}</p>
                </CardContent>
            </Card>

            {/* Processing Details */}
            {asRequest.processing_details && (
                <Card>
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
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">AS 사진</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-2">
                            {asRequest.photos.map((url: string, idx: number) => (
                                <img key={idx} src={url} alt={`AS 사진 ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg border" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Penalty */}
            {asRequest.penalty_amount > 0 && (
                <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="p-4 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">차감 금액</span>
                        <span className="text-lg font-bold text-red-600">
                            -{asRequest.penalty_amount.toLocaleString()}원
                        </span>
                    </CardContent>
                </Card>
            )}

            {/* Complete Button */}
            {asRequest.status !== 'resolved' ? (
                <Button
                    className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                    onClick={handleComplete}
                    disabled={completing}
                >
                    {completing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    작업 완료
                </Button>
            ) : (
                <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-green-600 font-semibold">
                        <CheckCircle2 className="h-5 w-5" />
                        처리 완료됨
                    </div>
                </div>
            )}
        </div>
    )
}
