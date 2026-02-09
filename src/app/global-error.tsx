'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Global Error:', error)
    }, [error])

    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                    <h2 className="text-xl font-bold mb-4">치명적인 오류가 발생했습니다</h2>
                    <p className="text-red-500 mb-6 bg-red-50 p-4 rounded text-sm font-mono max-w-md break-all">
                        {error.message}
                    </p>
                    <Button onClick={() => reset()}>다시 시도</Button>
                </div>
            </body>
        </html>
    )
}
