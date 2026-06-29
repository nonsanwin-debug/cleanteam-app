'use client'

import { useEffect, useState, useRef } from 'react'
import { getSiteDetails, getSitePhotos, updateSiteAdditional, getCompanySmsSettings, setEstimatedEndTime, completeWork, startWork } from '@/actions/worker'
import { getChecklistForSite, saveChecklistProgress } from '@/actions/checklist-submission'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowLeft, CheckSquare, Loader2, Share2, Phone, Pencil, Save, X, Wallet, MessageSquare, Clock, Plus, Minus, CheckCheck, PlayCircle } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WorkerSiteActions } from '@/components/worker/worker-site-actions'
import { PhotoUploader } from '@/components/worker/photo-uploader'
import { AssignedSite, SitePhoto } from '@/types'
import { toast } from 'sonner'
import { SiteChat } from '@/components/chat/site-chat'

const DEFAULT_TEMPLATE = {
    title: '기본 체크리스트',
    items: [
        { id: 'entrance', text: '현관 (신발장, 바닥, 거울)', type: 'check' },
        { id: 'living', text: '거실 (바닥, 창틀, 등기구)', type: 'check' },
        { id: 'kitchen', text: '주방 (싱크대, 수납장, 후드)', type: 'check' },
        { id: 'bathroom', text: '화장실 (변기, 세면대, 배수구)', type: 'check' },
        { id: 'rooms', text: '방 (바닥, 창문, 붙박이장)', type: 'check' },
        { id: 'veranda', text: '베란다/다용도실', type: 'check' },
    ]
}

export default function WorkerSitePage({ params }: { params: Promise<{ id: string }> }) {
    const [site, setSite] = useState<AssignedSite | null>(null)
    const [photos, setPhotos] = useState<SitePhoto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [completedWizardStep, setCompletedWizardStep] = useState<'closed' | 'checklist' | 'settlement'>('closed')
    const [checklistTemplate, setChecklistTemplate] = useState<any>(null)
    const [checklistAnswers, setChecklistAnswers] = useState<Record<string, string>>({})
    const [submittingChecklist, setSubmittingChecklist] = useState(false)
    const [completingWork, setCompletingWork] = useState(false)
    const [editingAdditional, setEditingAdditional] = useState(false)
    const [additionalAmountVal, setAdditionalAmountVal] = useState('')
    const [additionalDescVal, setAdditionalDescVal] = useState('')
    const [savingAdditional, setSavingAdditional] = useState(false)
    const [hideCleaningExamples, setHideCleaningExamples] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { getPlatformSettings } = await import('@/actions/platform-settings')
                const settings = await getPlatformSettings()
                setHideCleaningExamples(settings.hide_cleaning_fee_examples ?? false)
            } catch (err) {
                console.error('Failed to fetch settings:', err)
            }
        }
        fetchSettings()
    }, [])
    const [smsSettings, setSmsSettings] = useState<{ sms_enabled: boolean; sms_bank_name: string; sms_account_number: string; sms_message_template: string; company_collection_message: string } | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [currentUserName, setCurrentUserName] = useState<string>('')
    const [isSettingTime, setIsSettingTime] = useState(false)
    const [startingWork, setStartingWork] = useState(false)

    const router = useRouter()
    const checklistRef = useRef<any>(null)

    const handleStartWork = async () => {
        if (!site) return
        if (!confirm('작업을 시작하시겠습니까? (상태가 "진행 중"으로 변경됩니다)')) return
        setStartingWork(true)
        try {
            const res = await startWork(site.id, 'manual-start')
            if (res.success) {
                toast.success('작업이 시작되었습니다.')
                setSite({ ...site, status: 'in_progress' })
                router.refresh()
            } else {
                toast.error(res.error || '작업 시작에 실패했습니다.')
            }
        } catch (error) {
            console.error('Failed to start work:', error)
            toast.error('작업 시작 중 오류가 발생했습니다.')
        } finally {
            setStartingWork(false)
        }
    }


    useEffect(() => {
        let channel: any = null
        const supabase = createClient()

        const fetchSiteData = async () => {
            try {
                const resolvedParams = await params
                const siteId = resolvedParams.id

                // 현재 사용자 ID 가져오기
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setCurrentUserId(user.id)
                    // 유저 이름 가져오기
                    const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single()
                    if (userData?.name) setCurrentUserName(userData.name)
                }

                // Setup Realtime if not already set
                if (!channel) {
                    channel = supabase
                        .channel(`site_detail_${siteId}`)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'sites',
                                filter: `id=eq.${siteId}`
                            },
                            (payload) => {
                                console.log('Realtime update:', payload)

                                // Check if site was completed (customer submitted or by another user)
                                if (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'completed') {
                                    // 현재 사용자(팀장)가 직접 완료 처리한 경우, router.push가 이미 동작 중이므로 무시
                                    // 다른 사람(고객 등)이 완료한 경우에만 리다이렉트
                                    const isCurrentUserLeader = currentUserId && site?.worker_id === currentUserId
                                    if (!isCurrentUserLeader) {
                                        console.log('Site completed by another user, redirecting to home...')
                                        router.push('/worker/home')
                                    }
                                    return
                                }

                                fetchSiteData() // Re-fetch
                                router.refresh()
                            }
                        )
                        .subscribe()
                }

                // 1. Fetch Site Details
                const siteResponse = await getSiteDetails(siteId)
                if (!siteResponse.success || !siteResponse.data) {
                    setError(siteResponse.error || '현장 정보를 찾을 수 없습니다.')
                    setLoading(false)
                    return
                }
                setSite(siteResponse.data)

                // 2. Fetch Photos
                const photoResponse = await getSitePhotos(siteId)
                if (photoResponse.success && photoResponse.data) {
                    setPhotos(photoResponse.data)
                }

                // 3. Fetch Company SMS Settings
                const smsResponse = await getCompanySmsSettings()
                console.log('📱 Client SMS Response:', JSON.stringify(smsResponse))
                if (smsResponse.success && smsResponse.data) {
                    setSmsSettings(smsResponse.data)
                }

                // 4. Fetch Checklist Template and existing answers
                try {
                    const templateData = await getChecklistForSite(siteId)
                    setChecklistTemplate(templateData || null)

                    const { data: submission } = await supabase
                        .from('checklist_submissions')
                        .select('data')
                        .eq('site_id', siteId)
                        .maybeSingle()

                    if (submission?.data) {
                        setChecklistAnswers(submission.data)
                    }
                } catch (err) {
                    console.error('Failed to load checklist template/answers:', err)
                    setChecklistTemplate(null)
                }
            } catch (err) {
                console.error('Failed to fetch data:', err)
                setError('데이터를 불러오는 중 오류가 발생했습니다.')
            } finally {
                setLoading(false)
            }
        }

        fetchSiteData()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [params])

    // PWA 복귀 시 자동 갱신
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Site detail resumed, refreshing...')
                // params를 통해 siteId를 다시 가져와서 갱신
                params.then(p => {
                    const supabase = createClient()
                    const siteId = p.id
                    // 간단히 전체 데이터 다시 fetch
                    getSiteDetails(siteId).then(res => {
                        if (res.success && res.data) setSite(res.data)
                    })
                    getSitePhotos(siteId).then(res => {
                        if (res.success && res.data) setPhotos(res.data)
                    })
                })
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [params])

    const handleTriggerCopy = () => {
        if (checklistRef.current) {
            checklistRef.current.copyLink()
        } else {
            if (!site) return
            const getBaseUrl = () => {
                if (typeof window !== 'undefined') {
                    const origin = window.location.origin
                    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                        return origin
                    }
                }
                return process.env.NEXT_PUBLIC_SITE_URL || 'https://nexuspartner.kr'
            }
            const baseUrl = getBaseUrl()
            const link = `${baseUrl}/share/${site.id}`
            const copyText = `[NEXUS 작업 보고서]\n현장명: ${site.name}\n\n아래 링크를 눌러 상세 현장 사진과 작업 내역을 확인해 보세요.\n${link}`

            // Fallback Copy
            try {
                const textArea = document.createElement("textarea")
                textArea.value = copyText
                textArea.style.position = "fixed"
                textArea.style.left = "0"
                textArea.style.top = "0"
                textArea.style.opacity = "0"
                document.body.appendChild(textArea)
                textArea.focus({ preventScroll: true })
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
                toast.success('링크가 복사되었습니다.')
            } catch (err) {
                navigator.clipboard.writeText(copyText).then(() => {
                    toast.success('링크가 복사되었습니다.')
                }).catch(() => {
                    toast.error('복사 실패')
                })
            }
        }
    }

    const handleShareKakao = () => {
        if (!site) return

        const getBaseUrl = () => {
            if (typeof window !== 'undefined') {
                const origin = window.location.origin
                if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                    return origin
                }
            }
            return process.env.NEXT_PUBLIC_SITE_URL || 'https://nexuspartner.kr'
        }

        const shareUrl = `${getBaseUrl()}/share/${site.id}`
        const workerName = site.worker?.name || site.worker_name || '미배정'

        const sendKakaoMessage = () => {
            const kakaoObj = (window as any).Kakao
            if (kakaoObj) {
                if (!kakaoObj.isInitialized()) {
                    kakaoObj.init(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || 'c9b7bd6fa67ee5f5724b76fa58d72ecc')
                }
                kakaoObj.Share.sendCustom({
                    templateId: 134637,
                    templateArgs: {
                        siteName: site.name,
                        workerName: workerName,
                        webUrl: shareUrl
                    }
                })
            } else {
                toast.error('카카오톡 SDK 로드 중입니다. 잠시 후 다시 시도해 주세요.')
            }
        }

        if (typeof window !== 'undefined' && !(window as any).Kakao) {
            const script = document.createElement('script')
            script.src = 'https://t1.kakaocdn.net/kakao_js_sdk_v2/kakao.min.js'
            script.onload = () => {
                sendKakaoMessage()
            }
            script.onerror = () => {
                toast.error('카카오톡 공유 기능을 불러오지 못했습니다.')
            }
            document.head.appendChild(script)
        } else {
            sendKakaoMessage()
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !site) {
        return (
            <div className="p-4 text-center min-h-[50vh] flex flex-col justify-center items-center">
                <h3 className="text-lg font-bold text-red-600 mb-2">오류가 발생했습니다</h3>
                <p className="text-slate-500 mb-4">{error || '현장 정보를 불러오지 못했습니다.'}</p>
                <Link href="/worker/home">
                    <Button variant="outline">목록으로 돌아가기</Button>
                </Link>
            </div>
        )
    }

    const isLeader = !!(currentUserId && site.worker_id === currentUserId)

    const handleAddTime = async (minutes: number) => {
        if (!site) return
        setIsSettingTime(true)
        try {
            let baseTime = site.estimated_end_at ? new Date(site.estimated_end_at) : new Date()
            if (baseTime.getTime() < Date.now()) {
                baseTime = new Date()
            }
            const newTime = new Date(baseTime.getTime() + minutes * 60000)
            
            const res = await setEstimatedEndTime(site.id, newTime.toISOString())
            if (res.success) {
                toast.success('예상 종료 시간이 설정되었습니다.')
                setSite({ ...site, estimated_end_at: newTime.toISOString() })
            } else {
                toast.error(res.error || '시간 설정에 실패했습니다.')
            }
        } catch (error) {
            toast.error('시간 설정 중 오류가 발생했습니다.')
        } finally {
            setIsSettingTime(false)
        }
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Link href="/worker/home">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h2 className="text-lg font-bold truncate flex-1">{site.name}</h2>
                <Badge variant={site.status === 'in_progress' ? 'default' : 'secondary'}>
                    {site.status === 'in_progress' 
                        ? '진행 중' 
                        : site.status === 'completed' 
                            ? '완료됨' 
                            : site.status === 'scheduled' 
                                ? '예정됨' 
                                : site.status}
                </Badge>
            </div>

            {/* 작업 시작하기 카드 (팀장 전용 및 미시작 상태) */}
            {isLeader && (site.status === 'scheduled' || (site.status as string) === 'pending') && (
                <div className="bg-white border-2 border-indigo-200 rounded-lg p-5 shadow-sm bg-indigo-50/20 flex flex-col items-center justify-center text-center space-y-3.5">
                    <div className="bg-indigo-100/80 p-3.5 rounded-full shrink-0">
                        <PlayCircle className="w-10 h-10 text-indigo-600 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-base">아직 작업이 시작되지 않았습니다</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-normal">
                            현장에 도착하셨다면 아래 [작업 시작] 버튼을 눌러 상태를 진행 중으로 전환해 주세요.
                        </p>
                    </div>
                    <Button
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm transition-all"
                        onClick={handleStartWork}
                        disabled={startingWork}
                    >
                        {startingWork ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <PlayCircle className="w-5 h-5" />
                        )}
                        현장 작업 시작
                    </Button>
                </div>
            )}


            {/* 특이사항 경고 배너 */}
            {site.special_notes && (
                <div className="relative overflow-hidden rounded-lg border-2 border-red-400 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 p-3 animate-pulse">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-red-500 text-xs font-bold tracking-wider animate-bounce" style={{ animationDuration: '2s' }}>⚠️ 특이사항</span>
                    </div>
                    <div className="text-red-600 font-bold text-sm animate-pulse" style={{
                        textShadow: '0 0 8px rgba(239, 68, 68, 0.3)'
                    }}>{site.special_notes}</div>
                </div>
            )}

            {/* 예상 종료 시간 설정 (팀장 전용) - 진행 중 상태일 때만 노출 */}
            {isLeader && site.status !== 'completed' && (
                <section className="mb-4">
                    <div className="bg-white border rounded-lg p-4 shadow-sm border-indigo-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-600" />
                                <span className="font-bold text-slate-800">예상 완료 시간 설정</span>
                            </div>
                            {site.estimated_end_at && new Date(site.estimated_end_at).getTime() > Date.now() ? (
                                <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200">
                                    {new Date(site.estimated_end_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 완료 예정
                                </Badge>
                            ) : site.estimated_end_at ? (
                                <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">
                                    시간 초과됨
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-slate-500 bg-slate-50">
                                    미설정
                                </Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <Button
                                variant="outline"
                                className="w-full text-slate-700 font-medium hover:bg-rose-50 hover:text-rose-700 border-slate-200"
                                onClick={() => handleAddTime(-30)}
                                disabled={isSettingTime}
                            >
                                <Minus className="w-4 h-4 mr-1 text-rose-400" />30분
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full text-slate-700 font-medium hover:bg-rose-50 hover:text-rose-700 border-slate-200"
                                onClick={() => handleAddTime(-60)}
                                disabled={isSettingTime}
                            >
                                <Minus className="w-4 h-4 mr-1 text-rose-400" />1시간
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full text-slate-700 font-medium hover:bg-rose-50 hover:text-rose-700 border-slate-200"
                                onClick={() => handleAddTime(-120)}
                                disabled={isSettingTime}
                            >
                                <Minus className="w-4 h-4 mr-1 text-rose-400" />2시간
                            </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                variant="outline"
                                className="w-full text-slate-700 font-medium hover:bg-indigo-50 hover:text-indigo-700"
                                onClick={() => handleAddTime(30)}
                                disabled={isSettingTime}
                            >
                                <Plus className="w-4 h-4 mr-1 text-slate-400" />30분
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full text-slate-700 font-medium hover:bg-indigo-50 hover:text-indigo-700"
                                onClick={() => handleAddTime(60)}
                                disabled={isSettingTime}
                            >
                                <Plus className="w-4 h-4 mr-1 text-slate-400" />1시간
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full text-slate-700 font-medium hover:bg-indigo-50 hover:text-indigo-700"
                                onClick={() => handleAddTime(120)}
                                disabled={isSettingTime}
                            >
                                <Plus className="w-4 h-4 mr-1 text-slate-400" />2시간
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                            * 설정된 시간은 고객용 공유 페이지 상단에 실시간으로 표시됩니다.
                        </p>
                    </div>
                </section>
            )}

            {/* 고객전용페이지 고객에게 보내기 버튼 (팀장 전용, 완료 후에도 공유 가능) */}
            {isLeader && (
                <section className="mb-4">
                    <div className={`border rounded-lg p-4 shadow-sm ${
                        site.status === 'completed' 
                            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300' 
                            : 'bg-white border-indigo-100'
                    }`}>
                        <div className="flex items-center gap-2 mb-2">
                            {site.status === 'completed' ? (
                                <>
                                    <div className="bg-emerald-500 text-white p-1 rounded-full shrink-0">
                                        <CheckCheck className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-slate-800 text-base">🎉 작업 완료 보고서 공유</span>
                                </>
                            ) : (
                                <>
                                    <div className="bg-indigo-100 p-1 rounded-full shrink-0">
                                        <Share2 className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <span className="font-bold text-slate-800">고객 실시간 안내 페이지 공유</span>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mb-3.5 leading-normal">
                            {site.status === 'completed'
                                ? '작업이 완료되었습니다. 아래 버튼을 눌러 고객에게 완료 보고서 링크를 공유해 주세요.'
                                : '아래 버튼을 눌러 고객에게 실시간 작업 상황(진행 상태, 작업 사진 등)을 확인할 수 있는 페이지 링크를 전달합니다.'
                            }
                        </p>

                        {site.customer_phone ? (() => {
                            const getBaseUrl = () => {
                                if (typeof window !== 'undefined') {
                                    const origin = window.location.origin
                                    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                                        return origin
                                    }
                                }
                                return process.env.NEXT_PUBLIC_SITE_URL || 'https://nexuspartner.kr'
                            }
                            const baseUrl = getBaseUrl()
                            const link = `${baseUrl}/share/${site.id}`
                            const messageTemplate = site.status === 'completed'
                                ? `[NEXUS 작업 완료 보고서]\n현장명: ${site.name}\n\n의뢰하신 현장의 모든 작업이 완료되었습니다. 아래 링크를 눌러 완성된 사진과 완료 보고서를 확인해 보세요.\n${link}`
                                : `[NEXUS 작업 안내]\n현장명: ${site.name}\n\n아래 링크를 통해 실시간 작업 현황(사진 및 예상 시간)을 확인하실 수 있습니다.\n${link}`
                            const smsRef = `sms:${(site.customer_phone || '').split('/')[0].trim()}${/iPhone|iPad|iPod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') ? '&' : '?'}body=${encodeURIComponent(messageTemplate)}`
                            return (
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <a
                                        href={smsRef}
                                        className="w-full"
                                    >
                                        <Button
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11 text-xs"
                                        >
                                            <MessageSquare className="w-4 h-4 mr-1.5" />
                                            문자로 전송
                                        </Button>
                                    </a>
                                    <Button
                                        className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold h-11 text-xs"
                                        onClick={handleShareKakao}
                                    >
                                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.68 2.531-.777 2.94-.12.505.187.498.393.36.16-.107 2.537-1.724 3.56-2.42.49.068.995.105 1.51.105 4.97 0 9-3.186 9-7.115C21 6.185 16.97 3 12 3z"/>
                                        </svg>
                                        카카오톡 공유
                                    </Button>
                                </div>
                            )
                        })() : (
                            <div className="grid grid-cols-2 gap-2 w-full">
                                <Button
                                    variant="outline"
                                    className="w-full text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 font-bold h-11 text-xs"
                                    onClick={handleTriggerCopy}
                                >
                                    <Share2 className="w-4 h-4 mr-1.5" />
                                    링크 복사
                                </Button>
                                <Button
                                    className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold h-11 text-xs"
                                    onClick={handleShareKakao}
                                >
                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.68 2.531-.777 2.94-.12.505.187.498.393.36.16-.107 2.537-1.724 3.56-2.42.49.068.995.105 1.51.105 4.97 0 9-3.186 9-7.115C21 6.185 16.97 3 12 3z"/>
                                    </svg>
                                    카카오톡 공유
                                </Button>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Photo Section */}
            <section>
                <h3 className="font-bold mb-2 flex items-center">
                    사진 기록
                </h3>
                <PhotoUploader siteId={site.id} existingPhotos={photos} canDelete={isLeader} photoZones={site.photo_zones} />
            </section>

            {/* Chat Section */}
            {isLeader && (
                <section>
                    <h3 className="font-bold mb-2 flex items-center">
                        현장 채팅
                    </h3>
                    <SiteChat
                        siteId={site.id}
                        currentUserName={currentUserName}
                        currentUserRole="leader"
                        currentUserId={currentUserId || undefined}
                        customerPhone={site.customer_phone || site.manager_phone || undefined}
                    />
                </section>
            )}

            {/* 작업 완료 버튼 - 팀장 전용 및 진행 중 상태에서만 표시 */}
            {isLeader && site.status === 'in_progress' && (
                <div className="pt-4 border-t">
                    <Button
                        className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg rounded-xl flex items-center justify-center gap-2"
                        onClick={() => {
                            if (photos.length === 0) {
                                toast.error('사진 등록을 먼저 완료해주세요.')
                                return
                            }
                            if (!checklistTemplate || !checklistTemplate.items || checklistTemplate.items.length === 0) {
                                setCompletedWizardStep('settlement')
                            } else {
                                setCompletedWizardStep('checklist')
                            }
                        }}
                    >
                        <CheckCheck className="w-6 h-6" />
                        작업 완료
                    </Button>
                </div>
            )}


            {/* Completion Dialog Wizard */}
            <Dialog open={completedWizardStep !== 'closed'} onOpenChange={(open) => { if (!open) setCompletedWizardStep('closed') }}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-center">
                            {completedWizardStep === 'checklist' ? '작업 완료 체크리스트' : '정산 정보 확인 및 완료'}
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-500 text-sm mt-1">
                            {completedWizardStep === 'checklist' 
                                ? '작성하신 체크리스트 항목을 확인해주세요.' 
                                : '최종 정산 금액과 수금 방식을 확인 후 작업을 완료합니다.'}
                        </DialogDescription>
                    </DialogHeader>

                    {completedWizardStep === 'checklist' && checklistTemplate && (
                        <div className="space-y-6 py-4">
                            <h4 className="font-bold text-base text-slate-800 border-b pb-2">{checklistTemplate.title}</h4>
                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                                {checklistTemplate.items?.map((item: any) => (
                                    <div key={item.id} className="flex items-start space-x-3 pb-2 border-b border-slate-100 last:border-0">
                                        <Checkbox
                                            id={`modal-${item.id}`}
                                            checked={checklistAnswers[item.id] === 'checked'}
                                            onCheckedChange={(checked) => {
                                                setChecklistAnswers(prev => ({ ...prev, [item.id]: checked ? 'checked' : '' }))
                                            }}
                                            className="mt-0.5"
                                        />
                                        <Label
                                            htmlFor={`modal-${item.id}`}
                                            className={`text-sm cursor-pointer leading-snug ${checklistAnswers[item.id] === 'checked' ? 'text-green-600 font-bold' : 'text-slate-700'}`}
                                        >
                                            {item.text}
                                            {checklistAnswers[item.id] === 'checked' && (
                                                <span className="text-xs text-green-500 ml-1">(확인완료)</span>
                                            )}
                                        </Label>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold text-slate-800">특이사항 / 메모</Label>
                                <Textarea
                                    placeholder="특이사항이 있다면 적어주세요."
                                    value={checklistAnswers['notes'] || ''}
                                    onChange={(e) => {
                                        setChecklistAnswers(prev => ({ ...prev, notes: e.target.value }))
                                    }}
                                    className="resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setCompletedWizardStep('closed')}
                                >
                                    취소
                                </Button>
                                <Button
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => {
                                        setCompletedWizardStep('settlement')
                                    }}
                                >
                                    정산 정보 확인
                                </Button>
                            </div>
                        </div>
                    )}

                    {completedWizardStep === 'settlement' && (
                        <div className="space-y-6 py-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between py-1 border-b border-slate-200">
                                    <span className="text-sm text-slate-500">잔금</span>
                                    <span className="font-bold text-slate-800">{(site.balance_amount || 0).toLocaleString()}원</span>
                                </div>

                                {editingAdditional ? (
                                    <div className="space-y-3 py-1 border-b border-slate-200">
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1 font-medium">추가금액</label>
                                            <Input
                                                type="number"
                                                value={additionalAmountVal}
                                                onChange={(e) => setAdditionalAmountVal(e.target.value)}
                                                placeholder="추가금액 입력"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1 font-medium">추가 사유</label>
                                            <Textarea
                                                value={additionalDescVal}
                                                onChange={(e) => setAdditionalDescVal(e.target.value)}
                                                placeholder={hideCleaningExamples ? "추가 작업 내용을 입력하세요" : "예: 피톤치드 추가, 오염 심함 등"}
                                                className="bg-white resize-none text-xs"
                                                rows={2}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                                onClick={async () => {
                                                    setSavingAdditional(true)
                                                    const result = await updateSiteAdditional(
                                                        site.id,
                                                        parseInt(additionalAmountVal) || 0,
                                                        additionalDescVal
                                                    )
                                                    setSavingAdditional(false)
                                                    if (result.success) {
                                                        toast.success('추가금이 수정되었습니다.')
                                                        setSite(prev => prev ? {
                                                            ...prev,
                                                            additional_amount: parseInt(additionalAmountVal) || 0,
                                                            additional_description: additionalDescVal
                                                        } : prev)
                                                        setEditingAdditional(false)
                                                    } else {
                                                        toast.error(result.error || '수정 실패')
                                                    }
                                                }}
                                                disabled={savingAdditional}
                                            >
                                                {savingAdditional ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                ) : (
                                                    <Save className="h-4 w-4 mr-1" />
                                                )}
                                                저장
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingAdditional(false)}
                                                disabled={savingAdditional}
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                취소
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-1 border-b border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">추가금</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-blue-700">
                                                    {(site.additional_amount || 0).toLocaleString()}원
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setAdditionalAmountVal(String(site.additional_amount || 0))
                                                        setAdditionalDescVal(site.additional_description || '')
                                                        setEditingAdditional(true)
                                                    }}
                                                    className="p-1 rounded hover:bg-slate-200"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-blue-500" />
                                                </button>
                                            </div>
                                        </div>
                                        {site.additional_description && (
                                            <p className="text-xs text-slate-600 mt-1 bg-white/80 p-2 rounded">
                                                {site.additional_description}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-sm font-bold text-slate-700">총 합계 (잔금 + 추가)</span>
                                    <span className="font-bold text-lg text-green-700">
                                        {((site.balance_amount || 0) + (site.additional_amount || 0)).toLocaleString()}원
                                    </span>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                {site.collection_type === 'site' ? (
                                    <div className="space-y-3">
                                        <p className="font-bold text-red-600 text-sm text-center">
                                            ⚠️ 현장 팀장 수금입니다
                                        </p>
                                        {smsSettings?.sms_enabled ? (
                                            <>
                                                <p className="text-xs text-red-600 text-center font-medium">
                                                    버튼 클릭 시 고객에게 안내문자 발송 합니다
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-sm py-4 h-auto"
                                                    onClick={() => {
                                                        const balance = site.balance_amount || 0
                                                        const additional = site.additional_amount || 0
                                                        const total = balance + additional
                                                        const bankName = smsSettings?.sms_bank_name || '(은행 미설정)'
                                                        const accountNumber = smsSettings?.sms_account_number || '(계좌번호 미설정)'
                                                        const template = smsSettings?.sms_message_template || ''
                                                        const messageBody = template
                                                            .replace('{은행명}', bankName)
                                                            .replace('{계좌번호}', accountNumber)
                                                            .replace('{잔금}', balance.toLocaleString())
                                                            .replace('{추가금}', additional.toLocaleString())
                                                            .replace('{합계}', total.toLocaleString())
                                                        const phone = site.customer_phone || site.manager_phone || ''
                                                        const cleanPhone = phone.split('/')[0].trim().replace(/-/g, '')

                                                        // Copy to Clipboard
                                                        try {
                                                            navigator.clipboard.writeText(messageBody)
                                                            toast.success('문자 내용이 클립보드에 복사되었습니다')
                                                        } catch {
                                                            const textArea = document.createElement("textarea")
                                                            textArea.value = messageBody
                                                            textArea.style.position = "fixed"
                                                            textArea.style.left = "0"
                                                            textArea.style.top = "0"
                                                            textArea.style.opacity = "0"
                                                            document.body.appendChild(textArea)
                                                            textArea.focus({ preventScroll: true })
                                                            textArea.select()
                                                            document.execCommand('copy')
                                                            document.body.removeChild(textArea)
                                                            toast.success('문자 내용이 클립보드에 복사되었습니다')
                                                        }

                                                        // Open SMS App
                                                        setTimeout(() => {
                                                            window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(messageBody)}`
                                                        }, 300)
                                                    }}
                                                >
                                                    <MessageSquare className="w-4 h-4 mr-2" />
                                                    📱 고객에게 수금 문자 보내기
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="font-bold text-red-600 text-sm text-center">
                                            ⚠️ 업체수금 입니다
                                        </p>
                                        <p className="text-xs text-red-700 text-center font-medium leading-relaxed whitespace-pre-line">
                                            {smsSettings?.company_collection_message || '작업 종료 시 고객에게\n금액은 대표님께 직접 연락드리면 된다고 전달'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        if (!checklistTemplate || !checklistTemplate.items || checklistTemplate.items.length === 0) {
                                            setCompletedWizardStep('closed')
                                        } else {
                                            setCompletedWizardStep('checklist')
                                        }
                                    }}
                                    disabled={submittingChecklist || completingWork}
                                >
                                    {(!checklistTemplate || !checklistTemplate.items || checklistTemplate.items.length === 0) ? '취소' : '이전'}
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                                    onClick={async () => {
                                        setSubmittingChecklist(true)
                                        setCompletingWork(true)
                                        try {
                                            // 1. Save Checklist progress
                                            const saveRes = await saveChecklistProgress(site.id, checklistAnswers)
                                            if (!saveRes.success) {
                                                throw new Error(saveRes.error || '체크리스트 저장 중 오류가 발생했습니다.')
                                            }

                                            // 2. Complete Work
                                            const completeRes = await completeWork(site.id)
                                            if (!completeRes.success) {
                                                throw new Error(completeRes.error || '작업 완료 처리 중 오류가 발생했습니다.')
                                            }

                                            toast.success('작업이 완료되었습니다. 고객에게 완료 보고서를 공유해 주세요.')
                                            setCompletedWizardStep('closed')
                                            
                                            // Refresh site details
                                            const refreshRes = await getSiteDetails(site.id)
                                            if (refreshRes.success && refreshRes.data) {
                                                setSite(refreshRes.data)
                                            } else {
                                                setSite(prev => prev ? { ...prev, status: 'completed' } : null)
                                            }
                                            router.refresh()
                                        } catch (error: any) {
                                            console.error('Final completion failed:', error)
                                            toast.error(error.message || '작업 완료 처리에 실패했습니다.')
                                        } finally {
                                            setSubmittingChecklist(false)
                                            setCompletingWork(false)
                                        }
                                    }}
                                    disabled={submittingChecklist || completingWork}
                                >
                                    {(submittingChecklist || completingWork) ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            완료 중...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCheck className="h-4 w-4 mr-2" />
                                            최종 작업 완료
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
