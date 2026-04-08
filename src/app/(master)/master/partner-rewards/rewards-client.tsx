'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { approvePartnerReward } from '@/actions/master-rewards'
import { CheckCircle2, Gift, Search, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function MasterRewardsClient({ initialRewards }: { initialRewards: any[] }) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [tab, setTab] = useState<'pending' | 'paid'>('pending')
    
    // Approval Dialog State
    const [approvalDialog, setApprovalDialog] = useState<{ open: boolean, reward: any | null }>({
        open: false, reward: null
    })
    const [pointAmount, setPointAmount] = useState<string>('')
    const [memo, setMemo] = useState<string>('')

    const formatPoints = (amount: string) => {
        const value = amount.replace(/[^0-9]/g, '');
        return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    const onPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPointAmount(formatPoints(e.target.value))
    }

    const handleOpenDialog = (reward: any) => {
        const default10Percent = Math.floor(reward.base_price * 0.1)
        setPointAmount(formatPoints(default10Percent.toString()))
        setMemo(`[리워드 지급] 현장명: ${reward.site_name} (견적: ${reward.base_price.toLocaleString()}원)`)
        setApprovalDialog({ open: true, reward })
    }

    const handleApprove = async () => {
        const amount = parseInt(pointAmount.replace(/,/g, ''))
        if (isNaN(amount) || amount <= 0) {
            toast.error('유효한 지급 리워드 금액을 입력하세요.')
            return
        }

        const reward = approvalDialog.reward;
        if (!reward || !reward.company?.id) {
            toast.error('업체 정보가 유효하지 않습니다.')
            return
        }

        setIsUpdating(true)
        const result = await approvePartnerReward(reward.id, reward.company.id, amount, memo)
        setIsUpdating(false)

        if (result.success) {
            toast.success('포인트 지급이 완료되었습니다.')
            setApprovalDialog({ open: false, reward: null })
            setPointAmount('')
            setMemo('')
            router.refresh()
        } else {
            toast.error(result.error || '오류가 발생했습니다.')
        }
    }

    const filteredRewards = initialRewards.filter(r => {
        const lower = searchTerm.toLowerCase()
        const matchesSearch = lower === '' || 
            (r.company?.name && r.company.name.toLowerCase().includes(lower)) || 
            (r.site_name && r.site_name.toLowerCase().includes(lower))
            
        const isPaid = r.reward_paid || false
        const matchesTab = tab === 'pending' ? !isPaid : isPaid
        
        return matchesSearch && matchesTab
    })

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Gift className="w-5 h-5 text-teal-600" />
                        리워드(적립) 요청 목록
                    </CardTitle>
                    <CardDescription className="mt-1">
                        파트너가 "적립"을 선택하고, 현장이 "완료"된 목록입니다.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                
                <div className="flex flex-col sm:flex-row gap-4 justify-between h-auto sm:h-14 items-start sm:items-center mb-2">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                            className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", tab === 'pending' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            onClick={() => setTab('pending')}
                        >
                            미지급 대기
                        </button>
                        <button 
                            className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", tab === 'paid' ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            onClick={() => setTab('paid')}
                        >
                            지급 완료
                        </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input 
                            placeholder="업체명 또는 현장명 검색..."
                            className="pl-10 h-12 bg-white border-slate-200 shadow-sm text-sm rounded-xl focus-visible:ring-teal-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto bg-white border border-slate-100 rounded-lg shadow-sm">
                    <table className="w-full text-left align-middle border-collapse relative">
                        <thead>
                            <tr className="border-b bg-slate-50 h-12">
                                <th className="p-3 pl-4 font-semibold text-xs text-slate-600 min-w-[120px]">현장 일자</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 min-w-[200px]">현장명</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 min-w-[140px]">공유자(부동산)</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 text-right min-w-[120px]">총 결제(견적)액</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 text-right min-w-[120px]">10% 예상액</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 text-center min-w-[120px]">처리 상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRewards.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        조회된 현장이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredRewards.map(r => {
                                    const tenPercent = Math.floor(r.base_price * 0.1)
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 py-3 text-sm text-slate-500">
                                                {r.site_date ? format(new Date(r.site_date), 'yyyy-MM-dd') : '-'}
                                            </td>
                                            <td className="p-4 py-3 font-bold text-slate-800">
                                                {r.site_name}
                                                <div className="text-xs text-slate-400 font-normal mt-0.5">요청일: {format(new Date(r.created_at), 'MM/dd')}</div>
                                            </td>
                                            <td className="p-4 py-3">
                                                <div className="font-semibold text-teal-700">{r.company?.name || '정보 없음'}</div>
                                                <div className="text-xs text-slate-400">{r.company?.code}</div>
                                            </td>
                                            <td className="p-4 py-3 text-right font-semibold text-slate-700">
                                                {r.base_price.toLocaleString()} 원
                                            </td>
                                            <td className="p-4 py-3 text-right font-bold text-amber-600">
                                                +{tenPercent.toLocaleString()} P
                                            </td>
                                            <td className="p-4 py-3 text-center">
                                                {r.reward_paid ? (
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 pointer-events-none">지급 완료</Badge>
                                                ) : (
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-teal-600 hover:bg-teal-700 text-white h-8 text-xs w-full shadow-sm"
                                                        onClick={() => handleOpenDialog(r)}
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        지급 승인
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

            </CardContent>

            {/* Approval Dialog */}
            <Dialog open={approvalDialog.open} onOpenChange={(open) => !open && setApprovalDialog({ ...approvalDialog, open: false })}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg flex items-center gap-2">
                            <Gift className="w-5 h-5 text-teal-600" /> 파트너 리워드 지급
                        </DialogTitle>
                        <DialogDescription>
                            현장 진행이 완료되어 파트너에게 10% 포인트를 지급합니다.
                            <br />최종 지급 금액을 수정할 수 있습니다.
                        </DialogDescription>
                    </DialogHeader>

                    {approvalDialog.reward && (
                        <div className="space-y-4 py-2 mt-2">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-1 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>요청 파트너</span>
                                    <span className="font-bold text-slate-900">{approvalDialog.reward.company?.name}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>완료된 현장</span>
                                    <span className="text-slate-900 line-clamp-1 text-right max-w-[200px]">{approvalDialog.reward.site_name}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>총 결제금액</span>
                                    <span className="font-semibold text-slate-900">{approvalDialog.reward.base_price.toLocaleString()} 원</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold">실제 지급할 금액 (10%) *</Label>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        value={pointAmount}
                                        onChange={onPointChange}
                                        className="pl-8 text-lg font-bold bg-amber-50/50 border-amber-200 focus-visible:ring-amber-500"
                                        placeholder="0"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600">P</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600">지급 메모 (마스터 로그 기록용)</Label>
                                <Input
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    placeholder="로그에 기록될 내용입니다"
                                    className="h-10 border-slate-200"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setApprovalDialog({ ...approvalDialog, open: false })}>취소</Button>
                        <Button
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                            onClick={handleApprove}
                            disabled={isUpdating || !pointAmount}
                        >
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            지급 확정
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
