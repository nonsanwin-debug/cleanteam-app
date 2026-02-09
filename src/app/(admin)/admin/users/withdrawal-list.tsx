'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { processWithdrawal } from '@/actions/admin'
import { Loader2, Check, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

interface WithdrawalRequest {
    id: string
    user_id: string
    amount: number
    status: 'pending' | 'paid' | 'rejected'
    bank_info: any
    created_at: string
    users: {
        name: string
        phone: string
    }
}

export function WithdrawalList({ requests }: { requests: WithdrawalRequest[] }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)

    async function handleProcess(requestId: string, action: 'paid' | 'rejected') {
        let reason = ''
        if (action === 'rejected') {
            const input = prompt('거절 사유를 입력해주세요:')
            if (input === null) return // Cancelled
            reason = input
        } else {
            if (!confirm('이체 완료 처리하시겠습니까?')) return
        }

        setProcessingId(requestId)
        try {
            const result = await processWithdrawal(requestId, action, reason)
            if (result.success) {
                toast.success(action === 'paid' ? '지급 처리되었습니다.' : '반려 처리되었습니다.')
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.')
        } finally {
            setProcessingId(null)
        }
    }

    if (requests.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-slate-500">
                    접수된 출금 요청이 없습니다.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {requests.map(req => (
                <Card key={req.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg">{req.users?.name || '알 수 없음'}</span>
                                <Badge variant={
                                    req.status === 'paid' ? 'default' :
                                        req.status === 'rejected' ? 'destructive' : 'outline'
                                }>
                                    {req.status === 'paid' ? '지급완료' :
                                        req.status === 'rejected' ? '반려됨' : '대기중'}
                                </Badge>
                                <span className="text-sm text-slate-500">{new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                                <div>요청금액: <span className="font-bold text-slate-900">{req.amount.toLocaleString()}원</span></div>
                                <div>계좌정보: {JSON.stringify(req.bank_info)}</div>
                                <div>연락처: {req.users?.phone || '-'}</div>
                            </div>
                        </div>

                        {req.status === 'pending' && (
                            <div className="flex items-center gap-2 self-start sm:self-center">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => handleProcess(req.id, 'rejected')}
                                    disabled={!!processingId}
                                >
                                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
                                    반려
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handleProcess(req.id, 'paid')}
                                    disabled={!!processingId}
                                >
                                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                    지급 완료
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
