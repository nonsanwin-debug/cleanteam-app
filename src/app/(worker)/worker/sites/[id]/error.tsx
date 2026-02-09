'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Worker Site Error:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
            <div className="bg-red-50 p-4 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
                현장 정보를 불러올 수 없습니다
            </h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs break-all">
                {error.message || '알 수 없는 오류가 발생했습니다.'}
                {error.digest && <span className="block mt-1 text-xs text-slate-400">Digest: {error.digest}</span>}
            </p>
            <div className="flex gap-3">
                <Button onClick={() => reset()} variant="outline">
                    다시 시도
                </Button>
                <Button onClick={() => window.location.href = '/worker/home'}>
                    홈으로 이동
                </Button>
            </div>
        </div>
    )
}
