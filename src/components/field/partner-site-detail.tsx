'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PhotoUploader } from '@/components/worker/photo-uploader'
import { CalendarDays, MapPin, User, Phone, MessageSquare, Send, ChevronLeft, Camera, Clock } from 'lucide-react'
import Link from 'next/link'

function maskName(name: string | null) {
    if (!name) return '-'
    if (name.length <= 1) return name[0] + '*'
    return name[0] + '*'.repeat(name.length - 1)
}

export function PartnerSiteDetail({ siteId }: { siteId: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isFromOrders = searchParams.get('from') === 'orders'
    const [site, setSite] = useState<any>(null)
    const [photos, setPhotos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showAlert, setShowAlert] = useState(false)

    const fetchData = async () => {
        try {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            const { data: siteData, error: siteError } = await supabase
                .from('sites')
                .select('*, worker:users!worker_id(name, phone), company:companies!company_id(name)')
                .eq('id', siteId)
                .single()

            if (siteError) throw siteError
            setSite(siteData)

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

        const channel = supabase
            .channel(`partner_site_${siteId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `site_id=eq.${siteId}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sites', filter: `id=eq.${siteId}` }, () => fetchData())
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [siteId])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <header className="bg-white border-b sticky top-0 z-10">
                    <div className="max-w-md mx-auto px-4 h-14 flex items-center">
                        <button onClick={() => router.back()} className="w-8 h-8 -ml-2 mr-1 rounded-full hover:bg-slate-100 flex items-center justify-center">
                            <ChevronLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <span className="font-bold text-slate-800">현장 상세</span>
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
                    <div className="max-w-md mx-auto px-4 h-14 flex items-center">
                        <button onClick={() => router.back()} className="w-8 h-8 -ml-2 mr-1 rounded-full hover:bg-slate-100 flex items-center justify-center">
                            <ChevronLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <span className="font-bold text-slate-800">현장 상세</span>
                    </div>
                </header>
                <div className="p-8 text-center text-slate-500 mt-10">현장 정보를 불러올 수 없습니다.</div>
            </div>
        )
    }

    // 주소: 내 오더에서 진입하면 전체 주소, 피드에서 진입하면 동호수 제거
    const cleanAddress = isFromOrders 
        ? site.address 
        : (site.address
            ?.replace(/\d+동\s*/g, '')
            .replace(/\d+호\s*/g, '')
            .replace(/\d+-?\d*\s*/g, '')
            .replace(/\s+/g, ' ')
            .trim() || site.address)

    let statusText = '대기'
    let statusColor = 'bg-blue-500'
    if (site.status === 'completed') {
        statusText = '작업 완료'
        statusColor = 'bg-emerald-500'
    } else if (site.status === 'in_progress') {
        statusText = '진행중'
        statusColor = 'bg-orange-500'
    }

    const hasPhotos = photos.length > 0

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/share/${site.id}`
        if (navigator.share) {
            navigator.share({ title: 'NEXUS 작업 보고서', url: shareUrl })
        } else {
            navigator.clipboard.writeText(shareUrl)
            alert('고객 페이지 링크가 복사되었습니다!')
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <button onClick={() => router.back()} className="w-8 h-8 -ml-2 mr-1 rounded-full hover:bg-slate-100 flex items-center justify-center">
                            <ChevronLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <span className="font-bold text-slate-800 text-sm">현장 상세</span>
                    </div>
                    <Badge className={`${statusColor} text-white font-medium shadow-none`}>
                        {statusText}
                    </Badge>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-4">
                {/* 현장 정보 카드 */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 to-emerald-500"></div>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                            <MapPin className="h-4 w-4 text-teal-500" />
                            현장 정보
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                        {/* 주소 (동호수 제거) */}
                        <div className="flex items-start gap-2">
                            <span className="min-w-fit font-semibold text-slate-500">주소:</span>
                            <span className="text-slate-700 leading-snug">{cleanAddress}</span>
                        </div>

                        {/* 날짜/시간 */}
                        <div className="flex items-center gap-4 text-slate-600">
                            {site.cleaning_date && (
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                    {site.cleaning_date}
                                </span>
                            )}
                            {site.start_time && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                    <Clock className="w-3.5 h-3.5" />
                                    {site.start_time}
                                </span>
                            )}
                            {site.area_size && (
                                <span className="font-medium">{site.area_size}</span>
                            )}
                        </div>

                        {/* 팀장 */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-slate-500">담당:</span>
                            {isFromOrders ? (
                                <span className="text-slate-700 font-medium">{site.worker?.name || site.worker_name || '미배정'} 전문가</span>
                            ) : (
                                <>
                                    <span className="text-slate-700 font-medium">**</span>
                                    <span className="text-[10px] text-slate-400">(내 오더탭의 상세정보에서 전체공개)</span>
                                </>
                            )}
                        </div>

                        {/* 전화/문자 버튼 */}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            {isFromOrders ? (
                                <>
                                    <a
                                        href={`tel:${site.worker?.phone || site.worker_phone || ''}`}
                                        className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                                    >
                                        <Phone className="w-4 h-4" />
                                        전화 문의
                                    </a>
                                    <a
                                        href={`sms:${site.worker?.phone || site.worker_phone || ''}`}
                                        className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        문자 문의
                                    </a>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowAlert(true)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                                    >
                                        <Phone className="w-4 h-4 text-blue-500" />
                                        전화 문의
                                    </button>
                                    <button
                                        onClick={() => setShowAlert(true)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                                    >
                                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                                        문자 문의
                                    </button>
                                </>
                            )}
                        </div>

                        {/* 고객에게 전송 */}
                        <button
                            onClick={() => {
                                if (isFromOrders) {
                                    const shareUrl = `${window.location.origin}/share/${site.id}`
                                    if (navigator.share) {
                                        navigator.share({ title: 'NEXUS 작업 보고서', url: shareUrl })
                                    } else {
                                        navigator.clipboard.writeText(shareUrl)
                                        alert('고객 페이지 링크가 복사되었습니다!')
                                    }
                                } else {
                                    setShowAlert(true)
                                }
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-teal-50 border border-teal-200 rounded-lg text-sm font-bold text-teal-700 hover:bg-teal-100 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            고객에게 해당 페이지 전송
                        </button>
                        <p className="text-[10px] text-slate-400 text-center">
                            예약 유형이 고객링크 전송이면 고객에게 자동 발송됩니다
                        </p>
                    </CardContent>
                </Card>

                {/* 현장 사진 */}
                {hasPhotos && (
                    <section>
                        <h3 className="font-bold mb-2 flex items-center gap-2 text-base text-slate-800">
                            <Camera className="w-4 h-4 text-slate-400" />
                            현장 사진
                        </h3>
                        <PhotoUploader
                            siteId={site.id}
                            existingPhotos={photos}
                            readOnly={true}
                        />
                    </section>
                )}
            </main>

            {/* 비공개 알림 모달 */}
            {showAlert && createPortal(
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setShowAlert(false)}>
                    <div
                        className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 text-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                            <Phone className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">이용 안내</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            <strong className="text-slate-700">내 오더</strong> 탭에서 현장을 클릭 후<br/>
                            이용 시 이용 가능합니다.
                        </p>
                        <button
                            onClick={() => setShowAlert(false)}
                            className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors"
                        >
                            확인
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
