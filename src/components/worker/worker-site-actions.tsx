'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { completeWork } from '@/actions/worker'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface WorkerSiteActionsProps {
    siteId: string
    status: 'scheduled' | 'in_progress' | 'completed'
}

export function WorkerSiteActions({ siteId, status }: WorkerSiteActionsProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    async function handleComplete() {
        if (!confirm('모든 작업이 끝났습니까? 작업을 완료 상태로 변경합니다.')) return

        setIsLoading(true)
        try {
            await completeWork(siteId)
            toast.success('작업이 완료되었습니다.')
            router.refresh()
            // Optional: Redirect to home or stay
            router.push('/worker/home')
        } catch (error) {
            toast.error('작업 완료 처리 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    if (status !== 'in_progress') return null

    return (
        <section className="mt-8 mb-8">
            <Button
                onClick={handleComplete}
                className="w-full h-14 text-lg font-bold shadow-lg"
                size="lg"
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                작업 완료하기
            </Button>
            <p className="text-center text-xs text-slate-400 mt-2">
                * 사진 등록 및 체크리스트 작성을 마친 후 눌러주세요.
            </p>
        </section>
    )
}
