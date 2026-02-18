'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getAssignedSites, startWork, saveWorkerNotes } from '@/actions/worker'
import { getMyASRequests } from '@/actions/as-manage'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, PlayCircle, CheckCircle2, Clock, RefreshCcw, Phone, AlertTriangle, StickyNote, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { invalidateCache } from '@/lib/data-cache'

import { AssignedSite, ASRequest } from '@/types'


export default function WorkerHomePage() {
    const router = useRouter()
    const [sites, setSites] = useState<AssignedSite[]>([])
    const [asRequests, setAsRequests] = useState<ASRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const mountedRef = useRef(true)

    // 직접 서버 액션 호출 → 절대 stale closure 아님
    async function loadSites() {
        try {
            const [sitesData, asData] = await Promise.all([
                getAssignedSites(),
                getMyASRequests()
            ])
            if (!mountedRef.current) return
            setSites(sitesData)
            setAsRequests(asData)
            // 일정 페이지 등에서 사용하는 캐시도 무효화 (다음 진입 시 새로 fetch)
            invalidateCache('worker-sites', 'worker-as-requests')
        } catch (err) {
            console.error('loadSites error:', err)
        } finally {
            if (mountedRef.current) setLoading(false)
        }
    }

    // ref로 최신 loadSites 참조 유지 → setInterval에서 stale closure 방지
    const loadRef = useRef(loadSites)
    loadRef.current = loadSites

    useEffect(() => {
        mountedRef.current = true
        loadSites()

        // 현재 사용자 ID
        const supabaseClient = createClient()
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id)
        })

        // 푸시 구독
        if ('Notification' in window && (Notification.permission === 'granted' || Notification.permission === 'default')) {
            import('@/lib/push-notifications').then(({ subscribePush }) => {
                subscribePush().catch(() => { })
            })
        }

        // Realtime 구독 (RLS 정책이 있으면 즉시 반영)
        const supabase = createClient()
        const channel = supabase
            .channel('worker_home_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, () => {
                console.log('[Realtime] sites changed')
                loadRef.current()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_members' }, () => {
                console.log('[Realtime] site_members changed')
                loadRef.current()
            })
            .subscribe((status) => {
                console.log('[Realtime] subscription status:', status)
            })

        // 10초 폴링 (Realtime 미작동 시 fallback)
        const pollId = setInterval(() => {
            console.log('[Poll] refreshing...')
            loadRef.current()
        }, 10_000)

        // PWA 복귀 시 즉시 갱신
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                console.log('[Visibility] app resumed')
                loadRef.current()
            }
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            mountedRef.current = false
            supabase.removeChannel(channel)
            clearInterval(pollId)
            document.removeEventListener('visibilitychange', onVisible)
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
                                onNoteSaved={loadSites}
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
                                onNoteSaved={loadSites}
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
    currentUserId,
    onNoteSaved
}: {
    site: AssignedSite,
    isCompleted?: boolean,
    onStartWork?: (id: string) => void,
    processingId?: string | null,
    currentUserId?: string | null,
    onNoteSaved?: () => void
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
                    {isLeader && site.members && site.members.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Users className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs text-slate-500">팀원:</span>
                            {site.members.map((m, i) => (
                                <span key={m.user_id} className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    {m.name}
                                </span>
                            ))}
                        </div>
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

                {/* 현장 메모 (팀장 편집 / 팀원 읽기) */}
                <MemoSection site={site} isLeader={isLeader} onSaved={onNoteSaved} />

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
                    <div className="w-full space-y-2">
                        <Button
                            className="w-full text-lg h-12"
                            onClick={() => onStartWork && onStartWork(site.id)}
                            disabled={!!processingId}
                        >
                            {processingId === site.id ? <Loader2 className="animate-spin" /> : <PlayCircle className="mr-2" />}
                            작업 시작
                        </Button>
                        <Link href={`/worker/sites/${site.id}`} className="w-full block">
                            <Button className="w-full h-9 text-sm" variant="outline">
                                상세 보기
                            </Button>
                        </Link>
                    </div>
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

// 메모 섹션 컴포넌트
function MemoSection({ site, isLeader, onSaved }: { site: AssignedSite, isLeader: boolean, onSaved?: () => void }) {
    const [editing, setEditing] = useState(false)
    const [noteText, setNoteText] = useState(site.worker_notes || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await saveWorkerNotes(site.id, noteText)
            if (result.success) {
                toast.success('메모가 저장되었습니다.')
                setEditing(false)
                onSaved?.()
            } else {
                toast.error(result.error || '저장 실패')
            }
        } catch {
            toast.error('메모 저장 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // 팀원: 메모가 있을 때만 표시 (읽기 전용)
    if (!isLeader) {
        if (!site.worker_notes) return null
        return (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                    <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-blue-600 text-xs font-bold">팀장 메모</span>
                </div>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{site.worker_notes}</p>
            </div>
        )
    }

    // 팀장: 편집 모드
    if (editing) {
        return (
            <div className="mt-2 bg-blue-50 border border-blue-300 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-blue-600 text-xs font-bold">현장 메모</span>
                </div>
                <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="주차: B2, 열쇠 경비실, 비밀번호 1234# ..."
                    className="w-full text-sm border border-blue-200 rounded-md p-2 min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                />
                <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : '저장'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setNoteText(site.worker_notes || '') }}>
                        취소
                    </Button>
                </div>
            </div>
        )
    }

    // 팀장: 읽기 모드 (클릭하면 편집)
    return (
        <div
            className={`mt-2 rounded-lg p-2.5 cursor-pointer transition-colors ${site.worker_notes
                ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                : 'bg-slate-50 border border-dashed border-slate-300 hover:bg-slate-100'
                }`}
            onClick={() => setEditing(true)}
        >
            <div className="flex items-center gap-1.5">
                <StickyNote className={`h-3.5 w-3.5 ${site.worker_notes ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${site.worker_notes ? 'text-blue-600' : 'text-slate-400'}`}>
                    {site.worker_notes ? '현장 메모' : '메모 추가'}
                </span>
                <span className="text-slate-400 text-[10px]">탭하여 편집</span>
            </div>
            {site.worker_notes && (
                <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">{site.worker_notes}</p>
            )}
        </div>
    )
}
