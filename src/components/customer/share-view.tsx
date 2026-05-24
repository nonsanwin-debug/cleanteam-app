'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { PhotoUploader } from '@/components/worker/photo-uploader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CalendarDays, MapPin, User, MessageSquare, Phone, Sparkles, Clock, ChevronLeft } from 'lucide-react'
import { AdBanner } from '@/components/customer/ad-banner'
import { SiteChat } from '@/components/chat/site-chat'

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
            "현재 계획된 일정에 따라 각 구역별 작업을 꼼꼼하게 진행하고 있습니다.",
            "구석진 곳까지 세심하고 안전하게 관리하고 있습니다.",
            "지정 구역의 현장 관리가 예정대로 순조롭게 진행 중입니다.",
            "최상의 현장 컨디션을 위해 꼼꼼하게 준비하고 진행하고 있습니다. 잠시만 기다려주세요!"
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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <header className="bg-white border-b sticky top-0 z-10">
                    <div className="max-w-md mx-auto px-4 h-14 flex items-center relative">
                        <Link href="/" className="flex items-center justify-center w-8 h-8 -ml-2 mr-1 rounded-full hover:bg-slate-100 transition-colors">
                            <ChevronLeft className="w-5 h-5 text-slate-700" />
                        </Link>
                        <Link href="/" className="flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                            <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="#4F46E5" />
                                <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="#10B981" />
                                <path d="M5.25 4.75L18.75 19.25" stroke="#22D3EE" strokeWidth="5.5" strokeLinecap="round" />
                            </svg>
                            <h1 className="font-extrabold text-slate-800 tracking-tighter text-lg pt-0.5">NEXUS</h1>
                        </Link>
                    </div>
                </header>
                <div className="p-8 text-center text-slate-500 mt-10">Loading...</div>
            </div>
        )
    }

    if (error || !site) {
        return (
            <div className="min-h-screen bg-slate-50">
                <header className="bg-white border-b sticky top-0 z-10">
                    <div className="max-w-md mx-auto px-4 h-14 flex items-center relative">
                        <Link href="/" className="flex items-center justify-center w-8 h-8 -ml-2 mr-1 rounded-full hover:bg-slate-100 transition-colors">
                            <ChevronLeft className="w-5 h-5 text-slate-700" />
                        </Link>
                        <Link href="/" className="flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                            <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="#4F46E5" />
                                <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="#10B981" />
                                <path d="M5.25 4.75L18.75 19.25" stroke="#22D3EE" strokeWidth="5.5" strokeLinecap="round" />
                            </svg>
                            <h1 className="font-extrabold text-slate-800 tracking-tighter text-lg pt-0.5">NEXUS</h1>
                        </Link>
                    </div>
                </header>
                <div className="flex flex-col items-center justify-center p-4 mt-20">
                    <div className="text-center space-y-2">
                        <h1 className="text-xl font-bold text-slate-900">유효하지 않은 링크입니다</h1>
                        <p className="text-slate-500">존재하지 않는 현장이거나 삭제된 링크일 수 있습니다.<br/><span className="text-xs">(Client Error: {error})</span></p>
                    </div>
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
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Link href="/" className="flex items-center justify-center w-8 h-8 -ml-2 mr-0.5 rounded-full hover:bg-slate-100 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-slate-700" />
                            </Link>
                            <Link href="/" className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
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
                        </div>
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

                    {(site.worker?.phone || site.worker_phone) && (
                        <div className="mt-6 px-1">
                            <h3 className="text-center text-[13px] font-bold text-slate-400 mb-3">담당 팀장 바로 연락하기</h3>
                            <div className="flex gap-3">
                                <a href={`tel:${site.worker?.phone || site.worker_phone}`} className="flex flex-col items-center justify-center bg-white shadow-sm border border-slate-100 rounded-xl py-3.5 px-2 flex-1 hover:bg-slate-50 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                        <Phone className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-700">전화 걸기</span>
                                </a>
                                <a href={`sms:${site.worker?.phone || site.worker_phone}`} className="flex flex-col items-center justify-center bg-white shadow-sm border border-slate-100 rounded-xl py-3.5 px-2 flex-1 hover:bg-slate-50 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-700">문자 보내기</span>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Chat Section in scheduled view */}
                    <div className="mt-8 border-t border-slate-200 pt-6">
                        <h3 className="font-bold text-[15px] text-slate-800 mb-1">💬 실시간 현장 소통</h3>
                        <p className="text-xs text-slate-500 mb-3">작업 시작 전에도 팀장님과 실시간으로 대화할 수 있습니다.</p>
                        <SiteChat
                        siteId={site.id}
                        currentUserName={site.customer_name || ''}
                        currentUserRole="customer"
                        heightClass="h-[500px]"
                    />
                    </div>

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
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Link href="/" className="flex items-center justify-center w-8 h-8 -ml-2 mr-0.5 rounded-full hover:bg-slate-100 transition-colors">
                            <ChevronLeft className="w-5 h-5 text-slate-700" />
                        </Link>
                        <Link href="/" className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
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
                    </div>
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
                                        ? "작업이 곧 완료됩니다! 현장 최종 확인을 위해 이동해 주세요." 
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

                {/* Photos (ReadOnly) */}
                <section>
                    <h3 className="font-bold mb-2 flex items-center text-lg">
                        현장 사진
                    </h3>
                    <PhotoUploader
                        siteId={site.id}
                        existingPhotos={photos}
                        readOnly={true}
                        photoZones={site.photo_zones}
                    />
                </section>

                {/* Chat Section (Enlarged to 500px after removing bubble comments) */}
                <section>
                    <SiteChat
                        siteId={site.id}
                        currentUserName={site.customer_name || ''}
                        currentUserRole="customer"
                        heightClass="h-[500px]"
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
