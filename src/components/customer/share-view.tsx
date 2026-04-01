'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { PhotoUploader } from '@/components/worker/photo-uploader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CalendarDays, MapPin, User, MessageSquare, Phone, Sparkles, Clock } from 'lucide-react'
import { AdBanner } from '@/components/customer/ad-banner'

export function ShareView({ siteId }: { siteId: string }) {
    const [site, setSite] = useState<any>(null)
    const [photos, setPhotos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)
    const [isOverdue, setIsOverdue] = useState(false)
    const [randomMessage, setRandomMessage] = useState("")

    useEffect(() => {
        const messages = [
            "현재 주방과 화장실의 묵은 때와 치열하게 전투 중입니다!",
            "구석진 곳의 먼지 한 톨까지 꼼꼼하게 잡고 있습니다.",
            "지정 구역의 오염 제거가 예정대로 순조롭게 진행 중입니다.",
            "쾌적한 공간을 위해 마지막 땀방울을 흘리고 있습니다. 잠시만 기다려주세요!"
        ]
        setRandomMessage(messages[Math.floor(Math.random() * messages.length)])
    }, [])

    useEffect(() => {
        if (!site?.estimated_end_at || site.status === 'completed') {
            setTimeLeft(null)
            setIsOverdue(false)
            return
        }

        const calcTime = () => {
            const diff = new Date(site.estimated_end_at).getTime() - Date.now()
            if (diff <= 0) {
                setIsOverdue(true)
                setTimeLeft(null)
                return
            }
            setIsOverdue(false)
            const totalSeconds = Math.floor(diff / 1000)
            setTimeLeft({
                hours: Math.floor(totalSeconds / 3600),
                minutes: Math.floor((totalSeconds % 3600) / 60),
                seconds: totalSeconds % 60
            })
        }
        
        calcTime()
        const timer = setInterval(calcTime, 1000)
        return () => clearInterval(timer)
    }, [site?.estimated_end_at, site?.status])


    const fetchData = async () => {
        try {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            // Fetch Site
            const { data: siteData, error: siteError } = await supabase
                .from('sites')
                .select('*, worker:users!worker_id(name, phone), company:companies!company_id(name)') // Join with users and companies table
                .eq('id', siteId)
                .single()

            if (siteError) throw siteError
            setSite(siteData)

            // Fetch Photos
            const { data: photosData } = await supabase
                .from('photos')
                .select('*')
                .eq('site_id', siteId)
                .order('created_at', { ascending: true })

            setPhotos(photosData || [])

        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Realtime: photos, sites, checklist_submissions 구독
        const channel = supabase
            .channel(`share_realtime_${siteId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'photos',
                    filter: `site_id=eq.${siteId}`
                },
                (payload) => {
                    console.log('Photo change detected:', payload)
                    fetchData()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sites',
                    filter: `id=eq.${siteId}`
                },
                (payload) => {
                    console.log('Site change detected:', payload)
                    fetchData()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'checklist_submissions',
                    filter: `site_id=eq.${siteId}`
                },
                (payload) => {
                    console.log('Checklist change detected:', payload)
                    fetchData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [siteId])

    // PWA 복귀 시 자동 갱신
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Share page resumed, refreshing data...')
                fetchData()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])

    if (loading) return <div className="p-8 text-center bg-slate-50 min-h-screen">Loading...</div>

    if (error || !site) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center space-y-2">
                    <h1 className="text-xl font-bold text-slate-900">유효하지 않은 링크입니다</h1>
                    <p className="text-slate-500">존재하지 않는 현장이거나 삭제된 링크일 수 있습니다. (Client Error: {error})</p>
                </div>
            </div>
        )
    }

    // 작업 시작 전(scheduled) 접근 제한 화면
    if (site.status === 'scheduled') {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                {/* Header */}
                <header className="bg-white border-b sticky top-0 z-10">
                    <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between relative">
                        <Link href="/" className="flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                            <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="customer-grad-1-restricted" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#4F46E5" />
                                        <stop offset="100%" stopColor="#22D3EE" />
                                    </linearGradient>
                                    <linearGradient id="customer-grad-2-restricted" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#22D3EE" />
                                        <stop offset="100%" stopColor="#10B981" />
                                    </linearGradient>
                                    <linearGradient id="customer-grad-3-restricted" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#10B981" />
                                        <stop offset="100%" stopColor="#BEF264" />
                                    </linearGradient>
                                </defs>
                                <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#customer-grad-1-restricted)" />
                                <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#customer-grad-3-restricted)" />
                                <path d="M5.25 4.75L18.75 19.25" stroke="url(#customer-grad-2-restricted)" strokeWidth="5.5" strokeLinecap="round" />
                            </svg>
                            <h1 className="font-extrabold text-slate-800 tracking-tighter text-lg pt-0.5">NEXUS</h1>
                        </Link>
                        <div className="text-sm font-bold text-slate-600 truncate flex-1 text-right ml-4">
                            {site.name}
                        </div>
                    </div>
                </header>

                <main className="max-w-md mx-auto p-4 mt-8">
                    <Card className="border-none shadow-sm overflow-hidden text-center p-8 bg-white border border-slate-100">
                        <div className="mx-auto w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-5">
                            <Clock className="w-7 h-7 text-slate-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-3">작업 대기 중</h2>
                        <p className="text-slate-600 text-[15px] leading-relaxed break-keep">
                            <strong className="text-blue-600 font-semibold">[{site.company?.name || '담당 업체'}] [{site.worker?.name || site.worker_name || '담당 팀장'}]</strong>님의 작업 시작 처리가 되지 않아 현장 카드 열람이 제한되고 있습니다.<br/><br/>작업 시작 시 자동으로 활성화될 예정입니다.
                        </p>
                    </Card>
                    <div className="mt-8">
                        <AdBanner placement="share_above_text" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between relative">
                    <Link href="/" className="flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="customer-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#4F46E5" />
                                    <stop offset="100%" stopColor="#22D3EE" />
                                </linearGradient>
                                <linearGradient id="customer-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#22D3EE" />
                                    <stop offset="100%" stopColor="#10B981" />
                                </linearGradient>
                                <linearGradient id="customer-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset="100%" stopColor="#BEF264" />
                                </linearGradient>
                            </defs>
                            <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#customer-grad-1)" />
                            <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#customer-grad-3)" />
                            <path d="M5.25 4.75L18.75 19.25" stroke="url(#customer-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                        </svg>
                        <h1 className="font-extrabold text-slate-800 tracking-tighter text-lg pt-0.5">NEXUS</h1>
                    </Link>
                    <div className="text-sm font-bold text-slate-600 truncate flex-1 text-right ml-4">
                        {site.name}
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">
                {/* Timer Banner */}
                {site?.status !== 'completed' && (timeLeft || isOverdue) && (() => {
                    const isUnder30Mins = timeLeft && timeLeft.hours === 0 && timeLeft.minutes < 30
                    return (
                        <div className={`rounded-xl p-4 shadow-sm border text-white transition-colors duration-1000 ${
                            isOverdue 
                                ? 'bg-emerald-600 border-emerald-700' 
                                : isUnder30Mins 
                                    ? 'bg-orange-500 border-orange-600' 
                                    : 'bg-blue-600 border-blue-700'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                                    <Clock className="w-3.5 h-3.5" />
                                    {isOverdue ? '작업 예약 시간 종료' : '남은 예상 시간'}
                                </span>
                            </div>
                            {isOverdue ? (
                                <p className="text-xl font-extrabold tracking-tight mb-1 animate-pulse">
                                    예상 작업 시간이 종료되었습니다 ✨
                                </p>
                            ) : (
                                <p className={`text-4xl font-extrabold tracking-tight mb-1 font-mono tabular-nums ${isUnder30Mins ? 'animate-pulse' : ''}`}>
                                    {String(timeLeft!.hours).padStart(2, '0')}:
                                    {String(timeLeft!.minutes).padStart(2, '0')}:
                                    {String(timeLeft!.seconds).padStart(2, '0')}
                                </p>
                            )}
                            <p className="text-[13px] text-white/95 font-medium leading-relaxed break-keep mt-3 border-t border-white/20 pt-3">
                                {isOverdue 
                                    ? "현장 정리를 마치고 대기 중입니다. 서두르지 마시고 안전하게 도착하시면 연락해 주세요!" 
                                    : isUnder30Mins 
                                        ? "청소가 곧 완료됩니다! 현장 검수를 위해 이동해 주세요." 
                                        : randomMessage}
                            </p>
                        </div>
                    )
                })()}

                {/* Site Info */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                    <CardHeader className="pb-2 pt-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                                <MapPin className="h-4 w-4 text-blue-500" />
                                현장 정보
                            </CardTitle>
                            {site.status === 'completed' ? (
                                <Badge className="bg-green-500 hover:bg-green-600">작업 완료</Badge>
                            ) : site.status === 'in_progress' ? (
                                <Badge className="bg-blue-500 hover:bg-blue-600">작업 진행 중</Badge>
                            ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">현장 도착</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                        <div className="flex items-start gap-2 text-slate-700">
                            <span className="min-w-fit font-semibold text-slate-500">주소:</span>
                            <span className="leading-snug">{site.address}</span>
                        </div>
                        {site.cleaning_time && site.cleaning_time.includes('-') && site.status !== 'completed' && (
                            <div className="flex items-center gap-2 text-slate-700 bg-blue-50/50 p-2 rounded-md">
                                <span className="min-w-fit font-semibold text-slate-500">작업 종료 예정:</span>
                                맹<span>{site.cleaning_time.split('-')[1].trim()}</span>
                            </div>
                        )}
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-slate-700">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="font-semibold text-slate-500">담당자:</span>
                                <span>{site.worker?.name || site.worker_name || '미배정'} 전문가</span>
                            </div>
                            
                            {(site.worker?.phone || site.worker_phone) && (
                                <div className="flex gap-2 mt-2">
                                    <a href={`tel:${site.worker?.phone || site.worker_phone}`} className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-9 px-3 shadow-sm">
                                        <Phone className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                        전화 문의
                                    </a>
                                    <a href={`sms:${site.worker?.phone || site.worker_phone}`} className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-9 px-3 shadow-sm">
                                        <MessageSquare className="w-3.5 h-3.5 mr-2 text-green-600" />
                                        문자 문의
                                    </a>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 팀장 메시지 (말풍선 스타일) */}
                <div className="flex flex-col mb-8 mt-2 px-1">
                    <div className="flex items-start gap-3 w-full">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                        </div>
                        
                        {/* Message Content */}
                        <div className="flex flex-col flex-1 gap-1 max-w-[90%]">
                            <span className="text-sm text-slate-500 font-medium ml-1 flex items-center gap-1.5">
                                {site.worker?.name || site.worker_name || '담당 팀장'} 
                                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-sm">청소 전문가</span>
                            </span>
                            
                            {(() => {
                                const hasBeforePhotos = photos.some(p => p.type === 'before')
                                const hasDuringPhotos = photos.some(p => p.type === 'during')
                                const hasAfterPhotos = photos.some(p => p.type === 'after')
                                const hasSpecialPhotos = photos.some(p => p.type === 'special')
                                
                                return (

                            
                            <div className={`break-keep border rounded-2xl p-4 pb-5 text-[15px] leading-[1.6] shadow-sm relative ${
                                site.status === 'completed' ? 'bg-white border-slate-200 text-slate-800 rounded-tl-none' 
                                : 'bg-blue-50 border-blue-100 text-slate-800 rounded-tl-none'
                            }`}>
                                {/* Status specific messages */}
                                {site.status === 'completed' ? (
                                    <>
                                        <p className="font-bold text-blue-600 mb-2">"작업이 모두 무사히 완료되었습니다!"</p>
                                        <p className="mb-4">
                                            청소 현장 팀장 <strong>{site.worker?.name || site.worker_name || '미배정'}</strong>입니다. 모든 청소 작업을 마치고 완료 보고 드립니다.
                                            {hasAfterPhotos && (
                                                <span className="block mt-1">아래 <strong>현장 사진</strong>의 [작업 후] 탭에서 깨끗해진 현장 모습을 확인해 보세요.</span>
                                            )}
                                            {hasSpecialPhotos && (
                                                <span className="block mt-1">특이사항 탭에도 별도로 기록 사진을 남겨 두었으니 함께 확인 부탁드립니다.</span>
                                            )}
                                        </p>
                                        <p>
                                            작업 내용 중 궁금하신 점이나 확인이 필요한 부분이 있다면 편하게 연락 부탁드립니다. 감사합니다.
                                        </p>
                                    </>
                                ) : site.status === 'in_progress' ? (
                                    <>
                                        <p className="font-bold text-blue-600 mb-2">"지금은 한창 깨끗해지는 중입니다! 🧹"</p>
                                        <p className="mb-4">
                                            현재 구역별 오염 제거 작업을 열심히 진행하고 있습니다.
                                            {hasDuringPhotos && (
                                                <span className="block mt-1">아래 <strong>현장 사진</strong>의 [작업 중] 탭을 누르시면 실시간으로 변하고 있는 모습을 확인하실 수 있습니다.</span>
                                            )}
                                        </p>
                                        <p>
                                            궁금하신 점은 언제든 전화나 문자로 연락 주셔도 좋습니다!<br />
                                            작업이 끝나면 다시 반가운 소식으로 알림을 드릴게요. 안심하고 기다려 주세요!
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-bold text-blue-600 mb-2">"고객님, 현장에 도착했습니다! ✨"</p>
                                        <p className="mb-4">
                                            안녕하세요, 오늘 작업을 맡은 <strong>{site.worker?.name || site.worker_name || '미배정'}</strong> 팀장입니다. 방금 현장에 도착하여 장비 점검을 마쳤습니다.
                                        </p>
                                        <p>
                                            상태를 꼼꼼히 살피며 고객님의 소중한 공간을 정성껏 케어하겠습니다.
                                            {hasBeforePhotos && (
                                                <span className="block mt-1">아래 <strong>현장 사진</strong>의 [작업 전] 탭을 누르시면 현재 현장 모습을 확인하실 수 있습니다.</span>
                                            )}
                                        </p>
                                    </>
                                )}
                            </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Photos (ReadOnly) */}
                <section>
                    <h3 className="font-bold mb-2 flex items-center text-lg">
                        현장 사진
                    </h3>
                    <PhotoUploader
                        siteId={site.id}
                        existingPhotos={photos}
                        readOnly={true}
                    />
                </section>

                <div className="mt-8">
                    <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-4 mb-4 mt-6 flex gap-3 text-sm text-amber-900">
                        <span className="text-xl">💡</span>
                        <div className="flex flex-col gap-1">
                            <span className="font-bold">고객 가이드 안내</span>
                            <span className="mt-1">본 리포트는 보안을 위해 30일간 제공됩니다. 사진 저장이 필요하신 경우, 사진 상세 보기에서 <strong>'묶음 다운로드'</strong> 기능을 이용해 주시기 바랍니다.</span>
                        </div>
                    </div>

                    <AdBanner placement="share_above_text" />
                </div>
            </main>
        </div>
    )
}
