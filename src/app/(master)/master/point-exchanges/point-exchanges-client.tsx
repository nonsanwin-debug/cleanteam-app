'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { approvePointExchange, rejectPointExchange } from '@/actions/master-exchanges'
import { Gift, Check, X, Clock } from 'lucide-react'

interface Company {
    name: string
    code: string
}
interface User {
    name: string
    phone: string
}
interface RequestData {
    id: string
    company_id: string
    user_id: string
    amount: number
    status: string
    bank_name: string
    account_number: string // Phone number to receive
    account_holder: string
    rejection_reason: string
    created_at: string
    company: Company | null
    user: User | null
}

export function PointExchangesClient({ initialRequests }: { initialRequests: RequestData[] }) {
    const [requests, setRequests] = useState(initialRequests)
    const [processing, setProcessing] = useState<string | null>(null)

    const handleApprove = async (id: string, amount: number, companyName: string, recipientPhone: string) => {
        if (!confirm(`${companyName} 파트너의 ${amount.toLocaleString()} P 네이버페이 교환(${recipientPhone})을 승인(처리완료)하시겠습니까?`)) return
        
        setProcessing(id)
        const res = await approvePointExchange(id)
        setProcessing(null)

        if (res.success) {
            toast.success('승인 완료', { description: '네이버페이 포인트 교환 요청이 승인 처리되었습니다.' })
            setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'paid' } : req))
        } else {
            toast.error('승인 실패', { description: res.error })
        }
    }

    const handleReject = async (id: string) => {
        const reason = window.prompt('반려 사유를 입력해주세요 (선택사항, 파트너가 볼 수 있습니다)')
        if (reason === null) return // Canceled

        if (!confirm('정말로 이 포인트 교환 요청을 반려하고 포인트를 환불하시겠습니까?')) return
        
        setProcessing(id)
        const res = await rejectPointExchange(id, reason)
        setProcessing(null)

        if (res.success) {
            toast.success('반려 처리 완료', { description: '교환 요청을 반려하고 포인트를 환불했습니다.' })
            setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected', rejection_reason: reason } : req))
        } else {
            toast.error('처리 실패', { description: res.error })
        }
    }

    const pendingRequests = requests.filter(r => r.status === 'pending')
    const completedRequests = requests.filter(r => r.status !== 'pending')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Gift className="w-6 h-6 text-teal-600" />
                    네이버페이 교환 요청 관리
                </h1>
            </div>

            <Card className="border-teal-100 shadow-sm border-2">
                <CardHeader className="bg-teal-50/50 border-b border-teal-50 pb-4">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        승인 대기 중인 교환 요청 <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">{pendingRequests.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {pendingRequests.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 font-medium">
                            현재 대기 중인 네이버페이 포인트 교환 요청이 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 font-bold text-slate-600 w-[180px]">요청 일시</th>
                                        <th className="p-4 font-bold text-slate-600 w-[200px]">파트너(업체) 정보</th>
                                        <th className="p-4 font-bold text-slate-600 text-right w-[150px]">교환 포인트</th>
                                        <th className="p-4 font-bold text-teal-600 text-center w-[200px]">수령할 전화번호</th>
                                        <th className="p-4 font-bold text-slate-600 text-center w-[200px]">작업</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingRequests.map(req => (
                                        <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-mono text-slate-500 text-xs">
                                                {new Date(req.created_at).toLocaleString('ko-KR')}
                                            </td>
                                            <td className="p-4 font-bold text-slate-800">
                                                <div>{req.company?.name || '알수없음'}</div>
                                                <div className="text-xs text-slate-400 font-normal mt-0.5">{req.user?.name}</div>
                                            </td>
                                            <td className="p-4 font-extrabold text-teal-600 text-right text-base">
                                                {req.amount.toLocaleString()} P
                                            </td>
                                            <td className="p-4 text-center">
                                                <Badge variant="outline" className="bg-teal-50 border-teal-200 text-teal-700 font-mono tracking-wider px-3 py-1 text-sm">
                                                    {req.account_number || '번호 없음'}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                        disabled={processing === req.id}
                                                        onClick={() => handleApprove(req.id, req.amount, req.company?.name || '업체', req.account_number || '')}
                                                    >
                                                        {processing === req.id ? '처리중' : <><Check className="w-4 h-4 mr-1" /> 승인(완료)</>}
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                                        disabled={processing === req.id}
                                                        onClick={() => handleReject(req.id)}
                                                    >
                                                        <X className="w-4 h-4 mr-1" /> 반려(환불)
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm mt-8">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-bold text-slate-700">최근 처리 내역</CardTitle>
                </CardHeader>
                <CardContent className="p-0 opacity-80">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 text-slate-500 font-medium w-[180px]">일시</th>
                                    <th className="p-4 text-slate-500 font-medium">파트너명</th>
                                    <th className="p-4 text-slate-500 font-medium text-right">교환 금액</th>
                                    <th className="p-4 text-slate-500 font-medium text-center">수신 번호</th>
                                    <th className="p-4 text-slate-500 font-medium text-center">상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {completedRequests.slice(0, 50).map(req => (
                                    <tr key={req.id} className="border-b border-slate-100">
                                        <td className="p-4 font-mono text-slate-400 text-xs">
                                            {new Date(req.created_at).toLocaleString('ko-KR')}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {req.company?.name}
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-700">
                                            {req.amount.toLocaleString()} P
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-500 text-xs text-slate-400">
                                            {req.account_number}
                                        </td>
                                        <td className="p-4 text-center">
                                            {req.status === 'paid' 
                                                ? <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">승인됨(지급완료)</Badge>
                                                : <div className="flex flex-col items-center gap-1">
                                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">반려됨(환불완료)</Badge>
                                                    {req.rejection_reason && <span className="text-[10px] text-red-500">{req.rejection_reason}</span>}
                                                  </div>
                                            }
                                        </td>
                                    </tr>
                                ))}
                                {completedRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">처리 내역이 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
