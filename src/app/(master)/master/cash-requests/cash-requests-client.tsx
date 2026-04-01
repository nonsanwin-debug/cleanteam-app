'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { approveCashRequest, rejectCashRequest } from '@/actions/cash'
import { Wallet, Check, X, Clock } from 'lucide-react'

// types
interface Company {
    name: string
    code: string
}
interface RequestData {
    id: string
    company_id: string
    amount: number
    method: string
    status: string
    created_at: string
    company: Company | null
}

export function CashRequestsClient({ initialRequests }: { initialRequests: RequestData[] }) {
    const [requests, setRequests] = useState(initialRequests)
    const [processing, setProcessing] = useState<string | null>(null)

    const handleApprove = async (id: string, amount: number, companyName: string) => {
        if (!confirm(`${companyName} 업체의 ${amount.toLocaleString()} 캐쉬 충전을 승인하시겠습니까?`)) return
        
        setProcessing(id)
        const res = await approveCashRequest(id)
        setProcessing(null)

        if (res.success) {
            toast.success('승인 완료', { description: '캐쉬가 정상적으로 지급되었습니다.' })
            setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'approved' } : req))
        } else {
            toast.error('승인 실패', { description: res.error })
        }
    }

    const handleReject = async (id: string) => {
        if (!confirm('정말로 이 충전 요청을 반려하시겠습니까?')) return
        
        setProcessing(id)
        const res = await rejectCashRequest(id)
        setProcessing(null)

        if (res.success) {
            toast.success('반려 처리 완료', { description: '충전 요청을 반려했습니다.' })
            setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req))
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
                    <Wallet className="w-6 h-6 text-blue-600" />
                    캐쉬 충전 관리
                </h1>
            </div>

            <Card className="border-blue-100 shadow-sm border-2">
                <CardHeader className="bg-blue-50/50 border-b border-blue-50 pb-4">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        승인 대기 중인 요청 <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">{pendingRequests.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {pendingRequests.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 font-medium">
                            현재 승인 대기 중인 충전 요청이 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 font-bold text-slate-600 w-[180px]">요청 일시</th>
                                        <th className="p-4 font-bold text-slate-600">업체명</th>
                                        <th className="p-4 font-bold text-slate-600 text-right">요청 금액</th>
                                        <th className="p-4 font-bold text-slate-600 text-center">결제 수단</th>
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
                                                {req.company?.name} <span className="text-xs text-slate-400 font-normal">#{req.company?.code}</span>
                                            </td>
                                            <td className="p-4 font-extrabold text-blue-600 text-right text-base">
                                                {req.amount.toLocaleString()} C
                                            </td>
                                            <td className="p-4 text-center">
                                                <Badge variant="outline" className="bg-white">{req.method}</Badge>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                        disabled={processing === req.id}
                                                        onClick={() => handleApprove(req.id, req.amount, req.company?.name || '업체')}
                                                    >
                                                        {processing === req.id ? '처리중' : <><Check className="w-4 h-4 mr-1" /> 승인</>}
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                                        disabled={processing === req.id}
                                                        onClick={() => handleReject(req.id)}
                                                    >
                                                        <X className="w-4 h-4 mr-1" /> 반려
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
                                    <th className="p-4 text-slate-500 font-medium">업체명</th>
                                    <th className="p-4 text-slate-500 font-medium text-right">금액</th>
                                    <th className="p-4 text-slate-500 font-medium text-center">상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {completedRequests.slice(0, 10).map(req => (
                                    <tr key={req.id} className="border-b border-slate-100">
                                        <td className="p-4 font-mono text-slate-400 text-xs text-slate-400">
                                            {new Date(req.created_at).toLocaleString('ko-KR')}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {req.company?.name} <span className="text-xs text-slate-400">#{req.company?.code}</span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-700">
                                            {req.amount.toLocaleString()} C
                                        </td>
                                        <td className="p-4 text-center">
                                            {req.status === 'approved' 
                                                ? <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">승인됨</Badge>
                                                : <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">반려됨</Badge>
                                            }
                                        </td>
                                    </tr>
                                ))}
                                {completedRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400">처리 내역이 없습니다.</td>
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
