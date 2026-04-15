'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, CalendarDays, ChevronRight, CheckCircle2, AlertCircle, Loader2, Briefcase, Award, ShieldCheck } from 'lucide-react'
import { confirmOrderAssignee } from '@/actions/shared-orders'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function FieldHomeClient({ 
    partnerName, 
    ongoingCount, 
    recentOrders 
}: { 
    partnerName: string
    ongoingCount: number
    recentOrders: any[]
}) {
    const router = useRouter()
    const [confirmingId, setConfirmingId] = useState<string | null>(null)

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel('partner-home-refresh')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shared_orders' },
                () => { router.refresh() }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shared_order_applicants' },
                () => { router.refresh() }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router])

    return (
        <div className="p-4 space-y-6">
            
            {/* 1. Header Area */}
            <div className="pt-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-800 leading-tight">
                    반가워요, <br />
                    <span className="text-teal-600">{partnerName}</span> 대표님!
                </h1>
                <p className="text-base text-slate-500 mt-2 flex items-center gap-1.5">
                    현재 <strong className="text-teal-600 text-lg">{ongoingCount}</strong>건의 청소가 진행 중입니다.
                </p>
            </div>

            {/* 2. Big Action Button (Booking) */}
            <div className="pt-2">
                <button 
                    onClick={() => router.push('/field/book')}
                    className="w-full relative overflow-hidden bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-all text-white rounded-2xl shadow-lg border border-teal-500/20 group"
                >
                    <div className="p-8 flex flex-col items-center justify-center gap-3 relative z-10">
                        <div className="bg-white/20 p-3 rounded-full group-active:scale-95 transition-transform shrink-0">
                            <PlusCircle className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-center space-y-1">
                            <span className="text-2xl font-extrabold tracking-tight">신규 예약하기</span>
                            <p className="text-teal-50 text-sm font-medium opacity-90">10초 만에 간편하게 접수하세요</p>
                        </div>
                    </div>
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-black/5 rounded-full blur-xl pointer-events-none"></div>
                </button>
            </div>

            {/* 3. Recent Orders Preview */}
            <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-slate-400" />
                        최근 진행 내역
                    </h2>
                    {recentOrders.length > 0 && (
                        <button 
                            onClick={() => router.push('/field/orders')}
                            className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center"
                        >
                            전체보기 <ChevronRight className="w-4 h-4 ml-0.5" />
                        </button>
                    )}
                </div>

                {recentOrders.length === 0 ? (
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="p-6 text-center">
                            <p className="text-slate-500 font-medium">진행 중인 내역이 없습니다.</p>
                            <p className="text-sm text-slate-400 mt-1">상단의 버튼을 눌러 예약을 시작해보세요.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {recentOrders.map(order => {
                            let statusText = '대기중'
                            let statusColor = 'bg-blue-100 text-blue-700'
                            
                            if (order.status === 'accepted') {
                                statusText = order.accepted_company?.name ? `${order.accepted_company.name} 확정` : '업체 확정됨'
                                statusColor = 'bg-orange-100 text-orange-700'
                            } else if (order.status === 'open' && order.applicants && order.applicants.length > 0) {
                                statusText = order.applicants.length === 1 
                                    ? `${order.applicants[0].name} 요청` 
                                    : `${order.applicants[0].name} 외 ${order.applicants.length - 1}건`
                                statusColor = 'bg-orange-100 text-orange-700'
                            } else if (order.status === 'transferred') {
                                if (order.transferred_site?.status === 'completed') {
                                    statusText = '작업 완료'
                                    statusColor = 'bg-slate-100 text-slate-600'
                                } else if (order.transferred_site?.status === 'in_progress') {
                                    statusText = '현장 진행 중'
                                    statusColor = 'bg-teal-100 text-teal-700'
                                } else if (order.transferred_site?.status === 'scheduled') {
                                    statusText = '배정 완료 (대기중)'
                                    statusColor = 'bg-blue-100 text-blue-700'
                                } else {
                                    statusText = '이관 완료'
                                    statusColor = 'bg-teal-100 text-teal-700'
                                }
                            }
                            
                            return (
                                <Card 
                                    key={order.id} 
                                    className="hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => {
                                        if (order.transferred_site?.id) {
                                            router.push(`/share/${order.transferred_site.id}`)
                                        } else {
                                            router.push(`/field/orders`)
                                        }
                                    }}
                                >
                                    <CardContent className="p-4 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-800 truncate pr-2 max-w-[70%]">
                                                {order.region || '지역 미지정'}
                                            </span>
                                            <Badge className={`font-medium shadow-none ${statusColor}`}>
                                                {statusText}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-col gap-1.5 mt-1 text-sm text-slate-500">
                                            <span>
                                                {order.work_date ? order.work_date : '날짜 미정'} 
                                                {order.area_size && ` · ${order.area_size}`}
                                            </span>
                                            {order.accepted_company && (
                                                <div className="flex items-center gap-1.5 bg-slate-100 w-fit px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                                    {order.accepted_company.name}
                                                    {order.transferred_site?.worker?.name && (
                                                        <span className="text-slate-500 border-l border-slate-300 ml-1 pl-1.5 font-medium">
                                                            팀장: {order.transferred_site.worker.name}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* 배정 요청 업체 리스트 (대기중일 때만) */}
                                        {order.status === 'open' && order.applicants && order.applicants.length > 0 && (
                                            <div className="bg-orange-50/50 px-3 py-2 mt-2 border border-orange-100 rounded-lg">
                                                <p className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-1.5">
                                                    🤝 {order.applicants.length}개의 업체가 배정을 대기 중입니다!
                                                </p>
                                                <div className="space-y-2">
                                                    {order.applicants.map((app: any) => (
                                                        <div key={app.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-orange-200 shadow-sm">
                                                            <div className="flex flex-col gap-1 w-full max-w-[200px]">
                                                                <span className="font-bold text-slate-800 text-sm">{app.name}</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {app.badge_business && (
                                                                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 text-[10px] px-1.5 py-0 h-4 shadow-sm font-medium flex items-center gap-1">
                                                                            <Briefcase className="w-2.5 h-2.5 text-blue-600" /> 영업등록
                                                                        </Badge>
                                                                    )}
                                                                    {app.badge_excellent && (
                                                                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 text-[10px] px-1.5 py-0 h-4 shadow-sm font-medium flex items-center gap-1">
                                                                            <Award className="w-2.5 h-2.5 text-amber-500" /> 우수업체
                                                                        </Badge>
                                                                    )}
                                                                    {app.badge_aftercare && (
                                                                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 text-[10px] px-1.5 py-0 h-4 shadow-sm font-medium flex items-center gap-1">
                                                                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> AS보장
                                                                        </Badge>
                                                                    )}
                                                                    {(!app.badge_business && !app.badge_excellent && !app.badge_aftercare) && (
                                                                        <span className="text-[10px] text-slate-400 font-medium">인증 뱃지 없음</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative z-10",
                                                                    confirmingId === app.id
                                                                        ? "bg-slate-200 text-slate-500"
                                                                        : "bg-orange-500 text-white hover:bg-orange-600 shadow-sm cursor-pointer"
                                                                )}
                                                                disabled={!!confirmingId}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation()
                                                                    setConfirmingId(app.id)
                                                                    const res = await confirmOrderAssignee(order.id, app.id)
                                                                    if (res.success) {
                                                                        toast.success(`${app.name} 업체로 확정되었습니다!`)
                                                                        router.refresh()
                                                                    } else {
                                                                        toast.error(res.error || '업체 확정에 실패했습니다.')
                                                                    }
                                                                    setConfirmingId(null)
                                                                }}
                                                            >
                                                                {confirmingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '업체 확정'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Spacer for bottom nav */}
            <div className="h-6"></div>
        </div>
    )
}
