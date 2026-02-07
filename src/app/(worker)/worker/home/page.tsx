'use client'

import { useEffect, useState } from 'react'
import { getAssignedSites, startWork } from '@/actions/worker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Define the type locally to match the server action return
type AssignedSite = {
    id: string
    name: string
    address: string
    status: 'scheduled' | 'in_progress' | 'completed'
    created_at: string
    customer_name?: string
    customer_phone?: string
    residential_type?: string
    area_size?: string
    structure_type?: string
    cleaning_date?: string
    start_time?: string
    special_notes?: string
}

export default function WorkerHomePage() {
    const router = useRouter()
    const [sites, setSites] = useState<AssignedSite[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        loadSites()
    }, [])

    async function loadSites() {
        try {
            const data = await getAssignedSites()
            setSites(data)
        } catch (err) {
            toast.error('현장 목록을 불러오지 못했습니다.')
        } finally {
            setLoading(false)
        }
    }

    async function handleStartWork(siteId: string) {
        if (!confirm('작업을 시작하시겠습니까? (상태가 "진행 중"으로 변경됩니다)')) return

        setProcessingId(siteId)
        try {
            // No GPS check anymore, just start
            await startWork(siteId, 'manual-start')
            toast.success('작업이 시작되었습니다.')
            // Redirect to site detail immediately
            router.push(`/worker/sites/${siteId}`)
        } catch (error) {
            toast.error('작업 시작 실패')
            setProcessingId(null) // Only reset if failed, otherwise we are navigating away
        }
    }

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold">내 작업 목록</h2>
                    <p className="text-sm text-slate-500">오늘 할당된 현장: {sites.length}건</p>
                </div>
            </div>

            <div className="space-y-4">
                {sites.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-white rounded-lg">
                        할당된 작업이 없습니다.
                    </div>
                ) : (
                    sites.map((site) => (
                        <Card key={site.id} className={`border-l-4 ${site.status === 'in_progress' ? 'border-l-blue-500 shadow-md' : 'border-l-slate-300 opacity-90'}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant={site.status === 'in_progress' ? 'default' : 'secondary'}>
                                        {site.status === 'in_progress' ? '진행 중' : '대기 중'}
                                    </Badge>
                                    <span className="text-xs text-slate-400">
                                        {site.cleaning_date || new Date(site.created_at).toLocaleDateString()}
                                        {site.start_time && ` ${site.start_time}`}
                                    </span>
                                </div>
                                <CardTitle className="text-xl mt-2">{site.name}</CardTitle>
                                {site.customer_name && <p className="text-sm text-slate-500 font-normal">고객: {site.customer_name}</p>}
                            </CardHeader>
                            <CardContent className="pb-2 text-sm text-slate-600 space-y-3">
                                <div className="flex items-start">
                                    <MapPin className="h-4 w-4 mr-2 text-slate-400 mt-0.5 shrink-0" />
                                    <span className="break-keep">{site.address}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded">
                                    <div>
                                        <span className="text-slate-400 block">평수</span>
                                        <span>{site.area_size || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">구조</span>
                                        <span>{site.structure_type || '-'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-400 block">특이사항</span>
                                        <span className="text-red-500">{site.special_notes || '없음'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <a
                                        href={`https://m.map.kakao.com/actions/searchView?q=${encodeURIComponent(site.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full"
                                    >
                                        <Button size="sm" variant="outline" className="w-full h-9 text-xs border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-slate-900">
                                            카카오내비
                                        </Button>
                                    </a>
                                    <a
                                        href={`tmap://search?name=${encodeURIComponent(site.address)}`}
                                        className="w-full"
                                    >
                                        <Button size="sm" variant="outline" className="w-full h-9 text-xs border-green-500 bg-green-50 hover:bg-green-100 text-slate-900">
                                            티맵
                                        </Button>
                                    </a>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                                {site.status === 'scheduled' ? (
                                    <Button
                                        className="w-full text-lg h-12"
                                        onClick={() => handleStartWork(site.id)}
                                        disabled={!!processingId}
                                    >
                                        {processingId === site.id ? <Loader2 className="animate-spin" /> : <PlayCircle className="mr-2" />}
                                        작업 시작
                                    </Button>
                                ) : (
                                    <Link href={`/worker/sites/${site.id}`} className="w-full">
                                        <Button className="w-full text-lg h-12" variant="secondary">
                                            상세 보기 / 작업 계속
                                        </Button>
                                    </Link>
                                )}
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
