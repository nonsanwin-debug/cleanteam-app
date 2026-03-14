'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, PhoneCall, Clock, Users } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { requestHappyCallPush } from '@/actions/sites'

type ActiveSiteItemProps = {
    site: any
    isComplete: boolean
    duration: string
}

export function ActiveSiteItem({ site, isComplete, duration }: ActiveSiteItemProps) {
    const router = useRouter()
    const [isRequesting, setIsRequesting] = useState(false)
    
    // Derived status
    const isScheduled = site.status === 'scheduled'

    const formatTime = (isoString?: string) => {
        if (!isoString) return '-'
        const date = new Date(isoString)
        return new Intl.DateTimeFormat('ko-KR', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
            timeZone: 'Asia/Seoul'
        }).format(date)
    }

    const handleHappyCallRequest = async (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent div click
        if (!site.worker_id) {
            toast.error('팀장 미지정', { description: '현장에 배정된 팀장이 없습니다.' })
            return
        }
        
        setIsRequesting(true)
        try {
            const result = await requestHappyCallPush(site.id, site.worker_id)
            if (result.success) {
                toast.success('해피콜 요청 완료', { description: '배정된 팀원에게 해피콜 진행을 요청했습니다.' })
            } else {
                toast.error('요청 실패', { description: result.error })
            }
        } catch (error) {
            toast.error('요청 오류', { description: '해피콜 요청 중 오류가 발생했습니다.' })
        } finally {
            setIsRequesting(false)
        }
    }

    return (
        <div 
            onClick={() => router.push(`/admin/sites/${site.id}`)}
            className="flex flex-col sm:flex-row items-start sm:justify-between p-3 sm:p-4 border rounded-lg bg-white shadow-sm gap-3 sm:gap-0 cursor-pointer transition-all hover:border-blue-400 hover:shadow-md"
            role="button"
            tabIndex={0}
        >
            <div className="space-y-1 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex h-2 w-2 rounded-full shrink-0 ${isComplete ? 'bg-green-500' : isScheduled ? 'bg-slate-300' : 'bg-blue-500 animate-pulse'}`} />
                    <h4 className="font-semibold text-sm truncate">{site.name}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${isComplete
                        ? 'bg-green-50 text-green-600 border-green-200'
                        : isScheduled
                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                        : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                        {isComplete ? '완료됨' : isScheduled ? '대기중' : '작업 중'}
                    </span>
                    
                    {/* Happy Call Badge / Button */}
                    {site.happy_call_completed ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border shrink-0 bg-indigo-50 text-indigo-600 border-indigo-200 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />해피콜 완료
                        </span>
                    ) : (
                        <button 
                            type="button"
                            onClick={handleHappyCallRequest}
                            disabled={isRequesting}
                            className="text-[10px] px-1.5 py-0.5 rounded border shrink-0 bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 flex items-center gap-0.5 transition-colors"
                        >
                            {isRequesting ? <Loader2 className="w-3 h-3 animate-spin"/> : <PhoneCall className="w-3 h-3" />}
                            해피콜 요청
                        </button>
                    )}
                </div>
                <div className="flex items-center text-xs text-slate-500">
                    <Users className="mr-1 h-3 w-3" />
                    <span style={{ color: site.worker?.display_color || undefined }}>
                        {site.worker?.name || '팀장 미지정'}
                    </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                    {site.address}
                </div>
                {(site.special_notes || site.worker_notes) && (
                    <div className="mt-2 space-y-1">
                        {site.special_notes && (
                            <div className="text-[11px] bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 line-clamp-1">
                                <span className="font-bold mr-1">특이사항:</span>{site.special_notes}
                            </div>
                        )}
                        {site.worker_notes && (
                            <div className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 line-clamp-1">
                                <span className="font-bold mr-1">팀장메모:</span>{site.worker_notes}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="w-full sm:w-auto text-right sm:text-right pt-2 sm:pt-0 border-t sm:border-0 border-slate-50 flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end">
                {isComplete ? (
                    <div className="space-y-0.5 sm:space-y-1 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end gap-2 sm:gap-0">
                        <div className="text-xs text-slate-600">
                            <span className="sm:hidden mr-1 text-slate-400">시작</span>
                            <span className="font-medium">{site.started_at ? formatTime(site.started_at) : '-'}</span>
                            <span className="hidden sm:inline"> 작업시작</span>
                        </div>
                        <div className="text-xs text-slate-600">
                            <span className="sm:hidden mr-1 text-slate-400">종료</span>
                            <span className="font-medium">{formatTime(site.completed_at)}</span>
                            <span className="hidden sm:inline"> 작업마감</span>
                        </div>
                        <div className="text-xs font-bold text-green-600 mt-1 sm:mt-1">
                            {duration}
                        </div>
                    </div>
                ) : isScheduled ? (
                    <div className="space-y-0.5 sm:space-y-1 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-stretch">
                        <div className="text-xs font-medium text-slate-500">
                            오늘 방문 예정
                        </div>
                    </div>
                ) : (
                    <div className="space-y-0.5 sm:space-y-1 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-stretch">
                        <div className="text-xs text-slate-400">
                            {formatTime(site.started_at)} 시작됨
                        </div>
                        <div className="flex items-center justify-end text-blue-600 text-sm font-bold">
                            <Clock className="mr-1 h-3 w-3" />
                            {duration}째 작업 중
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
