'use client'

import { useEffect, useState } from 'react'
import { getAssignedSites, startWork } from '@/actions/worker'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, PlayCircle, CheckCircle2, Clock, RefreshCcw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { AssignedSite } from '@/types'


export default function WorkerHomePage() {
    const router = useRouter()
    const [sites, setSites] = useState<AssignedSite[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

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

    useEffect(() => {
        loadSites()

        const supabase = createClient()
        const channel = supabase
            .channel('worker_home_sites')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sites'
                },
                (payload) => {
                    console.log('Realtime update:', payload)

                    // Check if a site was updated to 'completed' status
                    if (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'completed') {
                        console.log('Site completed, redirecting to home...')
                        // Redirect worker to home page
                        window.location.href = 'https://cleanteam-app.vercel.app/worker/home'
                        return
                    }

                    loadSites()
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Polling fallback
    useEffect(() => {
        const intervalId = setInterval(() => {
            loadSites()
        }, 5000)
        return () => clearInterval(intervalId)
    }, [])

    async function handleStartWork(siteId: string) {
        if (!confirm('작업을 시작하시겠습니까? (상태가 "진행 중"으로 변경됩니다)')) return

        setProcessingId(siteId)
        try {
            // No GPS check anymore, just start
            const result = await startWork(siteId, 'manual-start')

            if (!result.success) {
                toast.error(result.error || '작업 시작에 실패했습니다.')
                setProcessingId(null)
                return
            }

            toast.success('작업이 시작되었습니다.')
            // Redirect to site detail immediately using hard reload to avoid soft nav issues
            // router.push(`/worker/sites/${siteId}`)
            window.location.href = `/worker/sites/${siteId}`
        } catch (error) {
            console.error(error)
            toast.error('알 수 없는 오류가 발생했습니다.')
            setProcessingId(null)
        }
    }

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    }

    // Filter sites based on status
    const activeSites = sites.filter(site => site.status !== 'completed')
    const completedSites = sites.filter(site => site.status === 'completed')

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-lg font-bold">작업 관리</h2>
                </div>
                <Button variant="outline" size="sm" onClick={loadSites} disabled={loading}>
                    <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    새로고침
                </Button>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="active">
                        내 작업 ({activeSites.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        완료된 작업 ({completedSites.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                    {activeSites.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-white rounded-lg border border-dashed">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>현재 할당된 작업이 없습니다.</p>
                        </div>
                    ) : (
                        activeSites.map((site) => (
                            <SiteCard
                                key={site.id}
                                site={site}
                                onStartWork={handleStartWork}
                                processingId={processingId}
                            />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                    {completedSites.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-white rounded-lg border border-dashed">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>아직 완료된 작업이 없습니다.</p>
                        </div>
                    ) : (
                        completedSites.map((site) => (
                            <SiteCard
                                key={site.id}
                                site={site}
                                isCompleted={true}
                            />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function SiteCard({
    site,
    isCompleted = false,
    onStartWork,
    processingId
}: {
    site: AssignedSite,
    isCompleted?: boolean,
    onStartWork?: (id: string) => void,
    processingId?: string | null
}) {
    return (
        <Card className={`border-l-4 ${site.status === 'in_progress' ? 'border-l-blue-500 shadow-md' : isCompleted ? 'border-l-green-500 opacity-80' : 'border-l-slate-300'}`}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant={site.status === 'in_progress' ? 'default' : isCompleted ? 'secondary' : 'outline'}>
                        {site.status === 'in_progress' ? '진행 중' : isCompleted ? '완료됨' : '대기 중'}
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
                    {site.special_notes && (
                        <div className="col-span-2">
                            <span className="text-slate-400 block">특이사항</span>
                            <span className="text-red-500">{site.special_notes}</span>
                        </div>
                    )}
                </div>

                {!isCompleted && (
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
                )}
            </CardContent>
            <CardFooter className="pt-2">
                {isCompleted ? (
                    <Link href={`/worker/sites/${site.id}`} className="w-full">
                        <Button className="w-full text-lg h-12" variant="outline">
                            <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
                            완료된 작업 보기
                        </Button>
                    </Link>
                ) : site.status === 'scheduled' ? (
                    <Button
                        className="w-full text-lg h-12"
                        onClick={() => onStartWork && onStartWork(site.id)}
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
    )
}
