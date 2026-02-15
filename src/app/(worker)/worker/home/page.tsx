'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAssignedSites, startWork } from '@/actions/worker'
import { getMyASRequests } from '@/actions/as-manage'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, PlayCircle, CheckCircle2, Clock, RefreshCcw, Phone, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCachedData } from '@/lib/data-cache'

import { AssignedSite, ASRequest } from '@/types'


export default function WorkerHomePage() {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    // SWR 캐시 패턴: 캐시 있으면 즉시 렌더링, 백그라운드 갱신
    const { data: sites, loading: sitesLoading, refresh: refreshSites } = useCachedData<AssignedSite[]>(
        'worker-sites',
        getAssignedSites,
        { staleTime: 15_000 }
    )

    const { data: asRequests, loading: asLoading, refresh: refreshAS } = useCachedData<ASRequest[]>(
        'worker-as-requests',
        getMyASRequests,
        { staleTime: 15_000 }
    )

    const loading = sitesLoading || asLoading

    const loadSites = useCallback(async () => {
        await Promise.all([refreshSites(), refreshAS()])
    }, [refreshSites, refreshAS])

    useEffect(() => {
        // 현재 사용자 ID 가져오기
        const supabaseClient = createClient()
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id)
        })

        // 로그인 후 푸시 구독 보장
        if ('Notification' in window && Notification.permission === 'granted') {
            import('@/lib/push-notifications').then(({ subscribePush }) => {
                subscribePush().catch(() => { })
            })
        } else if ('Notification' in window && Notification.permission === 'default') {
            import('@/lib/push-notifications').then(({ subscribePush }) => {
                subscribePush().catch(() => { })
            })
        }

        const supabase = createClient()
        const channel = supabase
            .channel('worker_home_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sites'
                },
                (payload) => {
                    console.log('Sites realtime update:', payload)
                    if (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'completed') {
                        console.log('Site completed, reloading...')
                        loadSites()
                        return
                    }
                    loadSites()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'site_members'
                },
                (payload) => {
                    console.log('Site members realtime update:', payload)
                    loadSites()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // 폴링 fallback (Realtime이 RLS 등으로 안 될 경우 대비) + PWA 복귀 시 자동 갱신
    useEffect(() => {
        const intervalId = setInterval(() => {
            loadSites()
        }, 10_000) // 10초마다 갱신 (Realtime fallback)

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('App resumed, refreshing data...')
                loadSites()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(intervalId)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
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
    const activeSites = (sites || []).filter(site => site.status !== 'completed')
    const completedSites = (sites || []).filter(site => site.status === 'completed')

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-lg font-bold">작업 관리 (V2)</h2>
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
                    {/* AS 내역 */}
                    {(asRequests || []).length > 0 && (
                        <div className="space-y-3 mb-4">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                AS 내역
                                <Badge variant="destructive" className="text-xs">{(asRequests || []).length}건</Badge>
                            </h3>
                            {(asRequests || []).map(req => {
                                const statusMap: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline' }> = {
                                    pending: { label: '접수/대기', variant: 'destructive' },
                                    monitoring: { label: '모니터링', variant: 'secondary' },
                                    resolved: { label: '처리완료', variant: 'outline' },
                                }
                                const st = statusMap[req.status] || { label: req.status, variant: 'outline' as const }
                                return (
                                    <Link key={req.id} href={`/worker/as/${req.id}`}>
                                        <Card className="border-l-4 border-l-red-400 hover:shadow-md transition-shadow cursor-pointer mb-2">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-semibold text-sm">{(req as any).site?.name || req.site_name}</span>
                                                    <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-1">{req.description}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] text-slate-400">{req.occurred_at}</span>
                                                    {(req.penalty_amount ?? 0) > 0 && (
                                                        <span className="text-xs text-red-600 font-bold">-{(req.penalty_amount ?? 0).toLocaleString()}원</span>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
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
                                currentUserId={currentUserId}
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
                                currentUserId={currentUserId}
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
    processingId,
    currentUserId
}: {
    site: AssignedSite,
    isCompleted?: boolean,
    onStartWork?: (id: string) => void,
    processingId?: string | null,
    currentUserId?: string | null
}) {
    const isLeader = !!(currentUserId && site.worker_id === currentUserId)

    // 오전/오후 판별
    const getTimeLabel = () => {
        if (!site.start_time) return null
        const hourMatch = site.start_time.match(/(\d{1,2})/)
        if (!hourMatch) return null
        const hour = parseInt(hourMatch[1], 10)
        if (hour < 12) return { label: '오전', color: 'bg-amber-500 text-white', time: site.start_time }
        return { label: '오후', color: 'bg-indigo-500 text-white', time: site.start_time }
    }
    const timeLabel = getTimeLabel()

    return (
        <Card className={`border-l-4 ${site.status === 'in_progress' ? 'border-l-blue-500 shadow-md' : isCompleted ? 'border-l-green-500 opacity-80' : 'border-l-slate-300'}`}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <Badge variant={site.status === 'in_progress' ? 'default' : isCompleted ? 'secondary' : 'outline'}>
                            {site.status === 'in_progress' ? '진행 중' : isCompleted ? '완료됨' : '대기 중'}
                        </Badge>
                        {timeLabel && (
                            <span className={`${timeLabel.color} text-xs font-bold px-2.5 py-1 rounded-full shadow-sm`}>
                                {timeLabel.label} {timeLabel.time}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-slate-400">
                        {site.cleaning_date || new Date(site.created_at).toLocaleDateString()}
                    </span>
                </div>
                <CardTitle className="text-xl mt-2">{site.name}</CardTitle>
                <div className="mt-2 space-y-1">
                    {site.customer_name && (
                        <p className="text-sm text-slate-600">고객: <span className="font-semibold text-slate-900">{site.customer_name}</span></p>
                    )}
                    {isLeader && (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            {site.customer_phone ? (
                                site.customer_phone.split('/').map((phone, idx) => {
                                    const trimmed = phone.trim()
                                    return (
                                        <a key={idx} href={`tel:${trimmed}`} className="flex items-center text-blue-600 font-bold text-base bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                                            <Phone className="h-4 w-4 mr-2" />
                                            <span>{trimmed}</span>
                                            <span className="ml-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">전화하기</span>
                                        </a>
                                    )
                                })
                            ) : (
                                <span className="text-slate-400 text-xs italic bg-slate-100 px-2 py-1 rounded">연락처 미등록</span>
                            )}
                        </div>
                    )}
                </div>
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
                        <div className="col-span-2 mt-1">
                            <div className="relative overflow-hidden rounded-lg border-2 border-red-400 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 p-2.5 animate-pulse">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-red-500 text-xs font-bold tracking-wider animate-bounce" style={{ animationDuration: '2s' }}>⚠️ 특이사항</span>
                                </div>
                                <span className="text-red-600 font-bold text-sm block" style={{
                                    textShadow: '0 0 8px rgba(239, 68, 68, 0.3)'
                                }}>{site.special_notes}</span>
                            </div>
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
                ) : site.status === 'scheduled' && isLeader ? (
                    <Button
                        className="w-full text-lg h-12"
                        onClick={() => onStartWork && onStartWork(site.id)}
                        disabled={!!processingId}
                    >
                        {processingId === site.id ? <Loader2 className="animate-spin" /> : <PlayCircle className="mr-2" />}
                        작업 시작
                    </Button>
                ) : site.status === 'scheduled' && !isLeader ? (
                    <Link href={`/worker/sites/${site.id}`} className="w-full">
                        <Button className="w-full text-lg h-12" variant="secondary">
                            상세 보기
                        </Button>
                    </Link>
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
