'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, CalendarDays, Camera, Clock, Megaphone, ClipboardList, Coins, Star, Phone, MessageSquare, Send, X, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import type { FeedSite } from '@/actions/partner-feed'
import type { PartnerNotice } from '@/actions/partner-notices'

function maskName(name: string | null) {
    if (!name) return '-'
    if (name.length <= 1) return name[0] + '*'
    return name[0] + '*'.repeat(name.length - 1)
}

export function FieldHomeClient({ 
    partnerName, 
    partnerId,
    feedSites,
    notices,
    isLoggedIn,
    bookingCount,
    bookingPoints,
    activityPoints
}: { 
    partnerName: string
    partnerId: string
    feedSites: FeedSite[]
    notices: PartnerNotice[]
    isLoggedIn: boolean
    bookingCount: number
    bookingPoints: number
    activityPoints: number
}) {
    const router = useRouter()
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
    const [showBookingMenu, setShowBookingMenu] = useState(false)
    const [showFeedAlert, setShowFeedAlert] = useState(false)
    const [showCount, setShowCount] = useState(10)
    const [showSmsModal, setShowSmsModal] = useState<'discount' | 'points' | null>(null)
    const [smsPhone, setSmsPhone] = useState('')
    const [showInfoCard, setShowInfoCard] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel('partner-home-refresh')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sites' },
                () => { router.refresh() }
            )
            .subscribe()

        // 뮨바일 뒤로가기 시 바텀시트만 닫기
        const handlePopState = () => {
            setShowBookingMenu(false)
            setShowSmsModal(null)
        }
        window.addEventListener('popstate', handlePopState)

        return () => {
            supabase.removeChannel(channel)
            window.removeEventListener('popstate', handlePopState)
        }
    }, [router])

    const handleImageError = (url: string) => {
        setImageErrors(prev => new Set(prev).add(url))
    }

    const ongoingCount = feedSites.filter(s => s.status !== 'completed').length

    return (
        <div className="p-4 space-y-6">
            
            {/* 1. Header Area */}
            <div className="pt-2">
                {isLoggedIn ? (
                    <>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 leading-tight">
                            반가워요, <br />
                            <span className="text-teal-600">{partnerName}</span> 대표님!
                        </h1>
                        <p className="text-base text-slate-500 mt-2 flex items-center gap-1.5">
                            현재 <strong className="text-teal-600 text-lg">{ongoingCount}</strong>건의 청소가 진행 중입니다.
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 leading-tight">
                            NEXUS 파트너센터에<br />
                            <span className="text-teal-600">오신 것을 환영합니다!</span>
                        </h1>
                        <p className="text-base text-slate-500 mt-2">
                            청소 서비스를 예약하려면 로그인이 필요합니다.
                        </p>
                    </>
                )}
            </div>

            {/* 1.5. 정보 카드 */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* 헤더 - 활동 포인트 + 토글 */}
                <button 
                    onClick={() => setShowInfoCard(!showInfoCard)}
                    className="w-full flex items-center justify-between px-4 py-3.5"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="bg-amber-50 p-2 rounded-lg">
                            <Star className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">활동 포인트</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-xl font-extrabold text-slate-800">
                            {isLoggedIn ? activityPoints.toLocaleString() : '-'}<span className="text-xs font-medium text-slate-400 ml-0.5">P</span>
                        </p>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showInfoCard ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {/* 접기/펴기 영역 */}
                {showInfoCard && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                        {/* 예약건수 */}
                        <div className="flex items-center justify-between px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-blue-50 p-2 rounded-lg">
                                    <ClipboardList className="w-4 h-4 text-blue-500" />
                                </div>
                                <span className="text-sm font-medium text-slate-600">예약건수</span>
                            </div>
                            <p className="text-xl font-extrabold text-slate-800">
                                {isLoggedIn ? bookingCount : '-'}<span className="text-xs font-medium text-slate-400 ml-0.5">건</span>
                            </p>
                        </div>

                        {/* 예약할인 포인트 */}
                        <div className="flex items-center justify-between px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-emerald-50 p-2 rounded-lg">
                                    <Coins className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="text-sm font-medium text-slate-600">예약할인 포인트</span>
                            </div>
                            <p className="text-xl font-extrabold text-slate-800">
                                {isLoggedIn ? bookingPoints.toLocaleString() : '-'}<span className="text-xs font-medium text-slate-400 ml-0.5">P</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Big Action Button (Booking) */}
            <div className="pt-2">
                <button 
                    onClick={() => {
                        if (!isLoggedIn) {
                            router.push('/auth/partner-login')
                            return
                        }
                        setShowBookingMenu(true)
                        window.history.pushState({ bookingMenu: true }, '')
                    }}
                    className="w-full relative overflow-hidden bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-all text-white rounded-2xl shadow-lg border border-teal-500/20 group"
                >
                    <div className="p-8 flex flex-col items-center justify-center gap-3 relative z-10">
                        <div className="bg-white/20 p-3 rounded-full group-active:scale-95 transition-transform shrink-0 animate-pulse">
                            <PlusCircle className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-center space-y-1">
                            <span className="text-2xl font-extrabold tracking-tight">신규 예약하기</span>
                            <p className="text-teal-50 text-sm font-medium opacity-90">10초 만에 간편하게 접수하세요</p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-black/5 rounded-full blur-xl pointer-events-none"></div>
                </button>
            </div>

            {/* 2.5. 공지사항 */}
            {notices.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                            <Megaphone className="w-4 h-4 text-teal-500" />
                            공지사항
                        </h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                        {notices.map(notice => (
                            <div
                                key={notice.id}
                                onClick={() => router.push(`/field/notices/${notice.id}`)}
                                className="min-w-[160px] max-w-[200px] bg-slate-50 border border-slate-200 rounded-xl p-4 snap-start shrink-0 hover:bg-slate-100 transition-colors cursor-pointer active:scale-[0.97]"
                            >
                                <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                                    {notice.title}
                                </p>
                                {notice.content && (
                                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                                        {notice.content}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. NEXUS 진행 내역 */}
            <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-slate-400" />
                        NEXUS 진행 내역
                    </h2>
                    <div className="flex items-center gap-2">
                        <select
                            value={showCount}
                            onChange={e => setShowCount(Number(e.target.value))}
                            className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 font-medium focus:outline-none"
                        >
                            <option value={10}>10건</option>
                            <option value={20}>20건</option>
                            <option value={30}>30건</option>
                            <option value={50}>전체 {feedSites.length}건</option>
                        </select>
                    </div>
                </div>

                {feedSites.length === 0 ? (
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="p-6 text-center">
                            <p className="text-slate-500 font-medium">등록된 현장이 없습니다.</p>
                            <p className="text-sm text-slate-400 mt-1">상단의 버튼을 눌러 예약을 시작해보세요.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {feedSites.slice(0, showCount).map(site => {
                            let statusText = '대기'
                            let statusColor = 'bg-blue-100 text-blue-700'
                            
                            if (site.status === 'completed') {
                                statusText = '작업 완료'
                                statusColor = 'bg-emerald-100 text-emerald-700'
                            } else if (site.status === 'in_progress') {
                                statusText = '진행중'
                                statusColor = 'bg-orange-100 text-orange-700'
                            }

                            const hasPhotos = site.before_photos.length > 0 || site.after_photos.length > 0

                            // 주소에서 동/호 제거 (예: "서울시 강남구 역삼동 123-4 ○○아파트 101동 1502호" → "서울시 강남구 역삼동 ○○아파트")
                            const cleanAddress = site.address
                                .replace(/\d+동\s*/g, '')
                                .replace(/\d+호\s*/g, '')
                                .replace(/\d+-?\d*\s*/g, '')
                                .replace(/\s+/g, ' ')
                                .trim()
                            
                            return (
                                <Card 
                                    key={site.id} 
                                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
                                    onClick={() => router.push(`/field/site/${site.id}`)}
                                >
                                    <CardContent className="p-4 space-y-3">
                                        {/* 주소 + 상태 */}
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-800 pr-2 max-w-[75%] line-clamp-2 leading-snug">
                                                {cleanAddress || site.address}
                                            </span>
                                            <Badge className={`font-medium shadow-none shrink-0 ${statusColor}`}>
                                                {statusText}
                                            </Badge>
                                        </div>

                                        {/* 날짜 / 시간 */}
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                                {site.cleaning_date || '날짜 미정'}
                                            </span>
                                            {site.start_time && (
                                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {site.start_time}
                                                </span>
                                            )}
                                        </div>

                                        {/* 작업 전/후 사진 (완료 현장만) */}
                                        {site.status === 'completed' && hasPhotos && (
                                            <div className="pt-2 border-t border-slate-100 space-y-3">
                                                {/* Before Photos */}
                                                {site.before_photos.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <Camera className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="text-xs font-bold text-blue-700">작업 전</span>
                                                        </div>
                                                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                                            {site.before_photos.map((url, i) => (
                                                                !imageErrors.has(url) && (
                                                                    <img
                                                                        key={`before-${i}`}
                                                                        src={url}
                                                                        alt={`작업 전 ${i + 1}`}
                                                                        className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0"
                                                                        onError={() => handleImageError(url)}
                                                                    />
                                                                )
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* After Photos */}
                                                {site.after_photos.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <Camera className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span className="text-xs font-bold text-emerald-700">작업 후</span>
                                                        </div>
                                                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                                            {site.after_photos.map((url, i) => (
                                                                !imageErrors.has(url) && (
                                                                    <img
                                                                        key={`after-${i}`}
                                                                        src={url}
                                                                        alt={`작업 후 ${i + 1}`}
                                                                        className="w-24 h-24 object-cover rounded-lg border border-emerald-200 shadow-sm shrink-0"
                                                                        onError={() => handleImageError(url)}
                                                                    />
                                                                )
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 담당 업체명 */}
                                        {site.company_name && (
                                            <p className="text-sm text-slate-500 pt-3 mt-1 border-t border-slate-100 font-medium">
                                                해당 현장 담당 업체명 : <span className="font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">{site.company_name}</span>
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="h-6"></div>

            {/* 예약 메뉴 바텀시트 */}
            {showBookingMenu && createPortal(
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setShowBookingMenu(false)}>
                    <div
                        className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-10 space-y-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center">
                            <div className="w-10 h-1 bg-slate-300 rounded-full" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 text-center">예약 방법 선택</h3>

                        {/* 전화 예약 */}
                        <a
                            href="tel:1644-4354"
                            className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                        >
                            <div className="bg-blue-500 p-2.5 rounded-xl">
                                <Phone className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">전화 예약</p>
                                <p className="text-xs text-slate-500 mt-0.5">1644-4354</p>
                            </div>
                        </a>

                        {/* 직접 예약 */}
                        <button
                            onClick={() => {
                                setShowBookingMenu(false)
                                router.push('/field/book')
                            }}
                            className="w-full flex items-center gap-4 p-4 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors text-left"
                        >
                            <div className="bg-teal-500 p-2.5 rounded-xl">
                                <PlusCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">직접 예약</p>
                                <p className="text-xs text-slate-500 mt-0.5">빠르고 간편하게 직접 접수</p>
                            </div>
                        </button>

                        {/* 고객 링크 전송 - 10% 할인 */}
                        <button
                            onClick={() => {
                                setShowBookingMenu(false)
                                setSmsPhone('')
                                setShowSmsModal('discount')
                            }}
                            className="w-full flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-left"
                        >
                            <div className="bg-red-500 p-2.5 rounded-xl">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">고객 링크 전송 — 10% 할인</p>
                                <p className="text-xs text-slate-500 mt-0.5">고객이 10% 할인된 견적으로 예약</p>
                                <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded mt-1 inline-block">10% 할인</span>
                            </div>
                        </button>

                        {/* 고객 링크 전송 - 10% 적립 */}
                        <button
                            onClick={() => {
                                setShowBookingMenu(false)
                                setSmsPhone('')
                                setShowSmsModal('points')
                            }}
                            className="w-full flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors text-left"
                        >
                            <div className="bg-emerald-500 p-2.5 rounded-xl">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">고객 링크 전송 — 10% 적립</p>
                                <p className="text-xs text-slate-500 mt-0.5">기본가로 진행, 완료 시 파트너에게 10% 적립</p>
                                <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded mt-1 inline-block">10% 적립</span>
                            </div>
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* 고객 링크 SMS 전송 모달 */}
            {showSmsModal && createPortal(
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setShowSmsModal(null)}>
                    <div
                        className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${showSmsModal === 'discount' ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                <Send className={`w-6 h-6 ${showSmsModal === 'discount' ? 'text-red-500' : 'text-emerald-500'}`} />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 mt-3">
                                고객 링크 전송 — {showSmsModal === 'discount' ? '10% 할인' : '10% 적립'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {showSmsModal === 'discount' ? '고객이 10% 할인된 견적으로 예약합니다' : '기본가로 진행, 완료 시 10%가 적립됩니다'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">고객 전화번호</label>
                            <input
                                type="tel"
                                value={smsPhone}
                                onChange={e => setSmsPhone(e.target.value)}
                                placeholder="010-0000-0000"
                                className="w-full h-12 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                autoFocus
                            />
                        </div>

                        <a
                            href={smsPhone.replace(/[^0-9]/g, '').length >= 10
                                ? `sms:${smsPhone.replace(/[^0-9]/g, '')}?body=${encodeURIComponent(`[NEXUS]\n아래의 링크를 눌러 예약을 진행하시면\n검증된 청소업체가 고객님의 공간을 치우고\n정리하며 케어합니다.\n(스마트배정을 통해 검증된 업체가 배정됩니다)\n\n${window.location.origin}/book/p/${partnerId}?r=${showSmsModal}`)}`
                                : '#'
                            }
                            onClick={(e) => {
                                if (smsPhone.replace(/[^0-9]/g, '').length < 10) {
                                    e.preventDefault()
                                    toast.error('올바른 전화번호를 입력해주세요.')
                                    return
                                }
                                setShowSmsModal(null)
                            }}
                            className={`w-full h-12 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
                                showSmsModal === 'discount' 
                                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}
                        >
                            <Send className="w-4 h-4" />
                            링크 전송
                        </a>

                        <button
                            onClick={() => setShowSmsModal(null)}
                            className="w-full h-10 text-sm font-medium text-slate-500 hover:text-slate-700"
                        >
                            취소
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* 피드 카드 비공개 알림 */}
            {showFeedAlert && createPortal(
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setShowFeedAlert(false)}>
                    <div
                        className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 text-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                            <Phone className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">현장 정보 비공개</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            해당 현장의 정보는 공개되어 있지 않습니다.<br/>
                            <strong className="text-slate-700">내 오더</strong> 메뉴에서 내가 예약한 현장의<br/>
                            카드를 클릭하시면 모든 기능을 이용하실 수 있습니다.
                        </p>
                        <button
                            onClick={() => setShowFeedAlert(false)}
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
