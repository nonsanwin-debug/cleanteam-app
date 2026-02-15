'use client'

import { useEffect, useState } from 'react'
import { uploadManager, UploadBatch } from '@/lib/upload-manager'
import { Loader2, CheckCircle2, XCircle, Upload } from 'lucide-react'

export function UploadIndicator() {
    const [batches, setBatches] = useState<UploadBatch[]>([])
    const [minimized, setMinimized] = useState(false)

    useEffect(() => {
        const update = () => setBatches(uploadManager.getActiveBatches())
        update()
        const unsubscribe = uploadManager.subscribe(update)
        return () => { unsubscribe() }
    }, [])

    if (batches.length === 0) return null

    const totalItems = batches.reduce((sum, b) => sum + b.totalCount, 0)
    const doneItems = batches.reduce((sum, b) => sum + b.doneCount, 0)
    const failItems = batches.reduce((sum, b) => sum + b.failCount, 0)
    const isComplete = doneItems + failItems >= totalItems
    const inProgress = totalItems - doneItems - failItems

    if (minimized) {
        return (
            <button
                onClick={() => setMinimized(false)}
                className="fixed bottom-20 right-4 z-50 bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg animate-pulse"
            >
                {isComplete ? (
                    <CheckCircle2 className="h-5 w-5" />
                ) : (
                    <div className="relative">
                        <Upload className="h-5 w-5" />
                        <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {inProgress}
                        </span>
                    </div>
                )}
            </button>
        )
    }

    return (
        <div className="fixed bottom-20 right-4 left-4 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-60 overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50 rounded-t-xl">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    {!isComplete && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {isComplete && failItems === 0 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {isComplete && failItems > 0 && <XCircle className="h-4 w-4 text-red-500" />}
                    <span>
                        사진 업로드 {isComplete ? '완료' : '중'}
                        {' '}({doneItems}/{totalItems})
                        {failItems > 0 && <span className="text-red-500 ml-1">실패 {failItems}</span>}
                    </span>
                </div>
                <button
                    onClick={() => setMinimized(true)}
                    className="text-slate-400 hover:text-slate-600 text-xs px-2"
                >
                    최소화
                </button>
            </div>

            {/* 진행 바 */}
            <div className="h-1.5 bg-slate-100">
                <div
                    className={`h-full transition-all duration-300 ${failItems > 0 ? 'bg-orange-400' : 'bg-primary'}`}
                    style={{ width: `${((doneItems + failItems) / totalItems) * 100}%` }}
                />
            </div>

            {/* 개별 파일 목록 */}
            <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-1">
                {batches.flatMap(b => b.items).map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-xs py-0.5">
                        {item.status === 'queued' && <span className="text-slate-300 shrink-0">○</span>}
                        {item.status === 'compressing' && <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />}
                        {item.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin text-orange-500 shrink-0" />}
                        {item.status === 'done' && <span className="text-green-500 shrink-0">✓</span>}
                        {item.status === 'failed' && <span className="text-red-500 shrink-0">✗</span>}
                        <span className={`truncate ${item.status === 'failed' ? 'text-red-600' :
                            item.status === 'done' ? 'text-green-700' : 'text-slate-500'
                            }`}>
                            {item.fileName}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
