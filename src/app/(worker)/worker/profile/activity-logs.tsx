'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Log {
    id: string
    type: 'earning' | 'commission' | 'penalty' | 'withdrawal_request' | 'withdrawal_paid' | 'withdrawal_refund' | 'manual_add' | 'manual_deduct'
    amount: number
    balance_after: number
    description: string
    created_at: string
}

export function ActivityLogs({ logs }: { logs: any[] }) {
    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'earning': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">커미션</Badge>
            case 'commission': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">커미션</Badge>
            case 'penalty': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">AS차감</Badge>
            case 'withdrawal_request': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">출금요청</Badge>
            case 'withdrawal_paid': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">출금완료</Badge>
            case 'withdrawal_refund': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">출금반려</Badge>
            case 'manual_add': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">수동지급</Badge>
            case 'manual_deduct': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">수동차감</Badge>
            default: return <Badge variant="outline">{type}</Badge>
        }
    }

    if (!logs || logs.length === 0) {
        return (
            <Card>
                <CardContent className="p-10 text-center text-muted-foreground text-sm">
                    기록된 내역이 없습니다.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                            <div className="text-xs text-slate-400 font-medium tracking-wide">
                                {format(new Date(log.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                            </div>
                        </div>

                        <div className="font-semibold text-sm text-slate-800 mb-2 leading-snug">
                            {log.description}
                        </div>

                        <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center gap-2">
                                {getTypeBadge(log.type)}
                                <span className={`text-sm font-bold ${['manual_deduct', 'penalty', 'withdrawal_request'].includes(log.type) ? 'text-red-500' : 'text-green-600'}`}>
                                    {['manual_deduct', 'penalty', 'withdrawal_request'].includes(log.type) ? '' : '+'}{log.amount.toLocaleString()} P
                                </span>
                            </div>
                            <div className="text-right text-xs text-slate-500 font-medium">
                                잔액: <span className="text-slate-700 font-bold">{log.balance_after.toLocaleString()} P</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
