'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CreditCard, Landmark, Wallet, CheckCircle2, AlertCircle, ArrowRightLeft, Clock, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { requestCashRecharge, convertCashToPoints } from '@/actions/cash'

interface RechargeReq {
    id: string
    amount: number
    method: string
    status: string
    created_at: string
}

interface Props {
    currentCash: number
    currentPoints: number
    requests: RechargeReq[]
}

const AMOUNTS = [
    { label: '1만', value: 10000, bonus: 0 },
    { label: '3만', value: 30000, bonus: 0 },
    { label: '5만', value: 50000, bonus: 0 },
    { label: '10만', value: 100000, bonus: 2 },
    { label: '30만', value: 300000, bonus: 5 },
    { label: '50만', value: 500000, bonus: 10 },
]

const METHODS = [
    { id: 'credit_card', label: '신용카드', icon: CreditCard },
    { id: 'bank_transfer', label: '계좌이체', icon: Landmark },
    { id: 'kakao_pay', label: '카카오페이', icon: Wallet },
]

export function RechargeClient({ currentCash, currentPoints, requests }: Props) {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
    const [customAmount, setCustomAmount] = useState('')
    const [selectedMethod, setSelectedMethod] = useState<string>('credit_card')
    const [isLoading, setIsLoading] = useState(false)
    const [isConverting, setIsConverting] = useState(false)

    // Convert Points State
    const [convertAmount, setConvertAmount] = useState('')

    const handleAmountSelect = (amount: number) => {
        setSelectedAmount(amount)
        setCustomAmount('')
    }

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '')
        setCustomAmount(val)
        setSelectedAmount(null)
    }

    const finalAmount = selectedAmount !== null ? selectedAmount : (parseInt(customAmount) || 0)

    const handleRecharge = async () => {
        if (finalAmount <= 0) {
            toast.error('오류', { description: '충전 금액을 선택해주세요.' })
            return
        }

        setIsLoading(true)
        const res = await requestCashRecharge(finalAmount, selectedMethod)
        setIsLoading(false)

        if (res.success) {
            toast.success('충전 요청 접수', { description: '결제 및 승인 확인 후 캐쉬가 충전됩니다.' })
            setSelectedAmount(null)
            setCustomAmount('')
        } else {
            toast.error('오류 발생', { description: res.error })
        }
    }

    const handleConvert = async () => {
        const amount = parseInt(convertAmount) || 0
        if (amount <= 0 || amount > currentCash) {
            toast.error('오류', { description: '올바른 전환 캐쉬를 입력해주세요.' })
            return
        }

        setIsConverting(true)
        const res = await convertCashToPoints(amount)
        setIsConverting(false)

        if (res.success) {
            const addedPoints = amount * 1000
            toast.success('포인트 전환 완료!', { description: `${amount.toLocaleString()} 캐쉬가 ${addedPoints.toLocaleString()} 관리포인트로 전환되었습니다.` })
            setConvertAmount('')
        } else {
            toast.error('오류 발생', { description: res.error })
        }
    }

    // 포맷 헬퍼
    const translateStatus = (status: string) => {
        if (status === 'pending') return <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">대기 중</Badge>
        if (status === 'approved') return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">충전 완료</Badge>
        if (status === 'rejected') return <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">요청 반려</Badge>
        return <Badge variant="outline">{status}</Badge>
    }

    return (
        <div className="space-y-6 max-w-4xl pb-10">
            {/* 1. 현재 잔액 및 정보 (Top Card) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-emerald-100 shadow-sm overflow-hidden relative bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <CardContent className="p-6 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-emerald-50 font-medium tracking-tight">현재 보유 캐쉬</h2>
                            <Wallet className="w-5 h-5 text-emerald-200" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold tracking-tight">{currentCash.toLocaleString()}</span>
                            <span className="text-xl font-medium text-emerald-100">C</span>
                        </div>
                    </CardContent>
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-32 h-32 rotate-12 flex"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.11-1.36-3.11-2.92v-4.61h5.78v-1.6c0-1.12-.9-2.03-2.03-2.03-1.12 0-2.03.9-2.03 2.03H6.88c0-2.18 1.77-3.95 3.95-3.95V3h2.67v1.93c1.71.36 3.11 1.36 3.11 2.92v4.61H10.83v1.6c0 1.12.9 2.03 2.03 2.03 1.12 0 2.03-.9 2.03-2.03h2.47c0 2.18-1.77 3.95-3.95 3.95z"/></svg>
                    </div>
                </Card>
                <Card className="border-blue-100 shadow-sm overflow-hidden relative bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <CardContent className="p-6 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-blue-50 font-medium tracking-tight">관리포인트</h2>
                            <Sparkles className="w-5 h-5 text-blue-200" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold tracking-tight">{currentPoints.toLocaleString()}</span>
                            <span className="text-xl font-medium text-blue-100">P</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 캐쉬를 포인트로 전환 (1000:1 교환 구현부) */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                        <ArrowRightLeft className="w-4 h-4 text-primary" />
                        캐쉬 → 관리포인트 전환
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                    <p className="text-sm text-slate-500">
                        충전된 캐쉬를 사용하여 오더 수수료를 결제하기 위한 <strong>관리포인트</strong>로 전환합니다. (전환 비율: 1 캐쉬 = 1,000 관리포인트)
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-xs">
                            <Input 
                                type="number" 
                                placeholder="전환할 캐쉬 금액 입력" 
                                value={convertAmount}
                                onChange={(e) => setConvertAmount(e.target.value)}
                                className="pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">C</span>
                        </div>
                        <Button onClick={handleConvert} disabled={isConverting} className="bg-slate-800 hover:bg-slate-900">
                            {isConverting ? '처리 중...' : '포인트로 전환하기'}
                        </Button>
                    </div>
                </CardContent>
            </Card>


            {/* 충전 영역 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* 2. 충전 금액 선택 */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs">1</span>
                                충전 금액 선택
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                {AMOUNTS.map((amt) => {
                                    const isSelected = selectedAmount === amt.value
                                    return (
                                        <button
                                            key={amt.value}
                                            onClick={() => handleAmountSelect(amt.value)}
                                            className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                                                isSelected 
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                                                    : 'border-slate-100 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {amt.bonus > 0 && (
                                                <div className="absolute -top-2.5 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                                    +{amt.bonus}% 혜택
                                                </div>
                                            )}
                                            <span className="text-lg font-bold tracking-tight">{amt.label}</span>
                                            <span className="text-xs opacity-70 font-medium">{(amt.value + amt.value * amt.bonus / 100).toLocaleString()} C</span>
                                        </button>
                                    )
                                })}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-sm font-medium text-slate-700 mb-2">직접 입력</p>
                                <div className="relative max-w-sm">
                                    <Input 
                                        type="text" 
                                        placeholder="충전할 금액을 입력하세요" 
                                        value={customAmount}
                                        onChange={handleCustomAmountChange}
                                        className={`pr-10 font-medium ${selectedAmount === null && customAmount !== '' ? 'border-primary ring-1 ring-primary/20' : ''}`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">원</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. 결제 수단 선택 */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs">2</span>
                                결제 수단 선택
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="grid grid-cols-3 gap-3">
                                {METHODS.map((method) => {
                                    const Icon = method.icon
                                    const isSelected = selectedMethod === method.id
                                    return (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedMethod(method.id)}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                                                isSelected 
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                                                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                                            <span className="text-sm font-bold tracking-tight">{method.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 우측 진행 및 사이드 결제 버튼 영역 */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm sticky top-6">
                        <CardHeader className="pb-4 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800">충전 요약</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">선택된 금액</span>
                                <span className="font-bold text-slate-700">{finalAmount.toLocaleString()} 원</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">결제 수단</span>
                                <span className="font-bold text-slate-700">
                                    {METHODS.find(m => m.id === selectedMethod)?.label || '선택 안됨'}
                                </span>
                            </div>
                            
                            {/* Warning Base */}
                            <div className="bg-slate-50 rounded-lg p-3 text-[12px] text-slate-500 leading-relaxed border border-slate-100 mt-4 break-keep">
                                <p className="mb-1 flex items-start gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span>현재 마스터 관리자가 직접 승인 후 실제 캐쉬가 충전됩니다. 가상 계좌 결제나 무통장 입금 시 처리지연이 될 수 있습니다.</span>
                                </p>
                                <p className="ml-4.5">- 충전 후 취소는 7일 이내 사용하지 않은 캐쉬에 한해 가능합니다.</p>
                            </div>
                            
                            <Button 
                                className="w-full py-6 text-lg font-bold shadow-md bg-blue-600 hover:bg-blue-700 transition-colors"
                                onClick={handleRecharge}
                                disabled={isLoading || finalAmount <= 0}
                            >
                                {isLoading ? '처리 중...' : `${finalAmount.toLocaleString()}원 결제하기`}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 4. 최근 내역 */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                        <Clock className="w-4 h-4 text-slate-400" />
                        최근 충전 신청 내역 <span className="ml-1 text-xs font-normal text-slate-400 font-mono">(최대 5건 표시)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {requests.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                            최근 충전 내역이 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="font-medium text-slate-500 text-left p-4 pl-6">일시</th>
                                        <th className="font-medium text-slate-500 text-left p-4">신청 금액</th>
                                        <th className="font-medium text-slate-500 text-left p-4">수단</th>
                                        <th className="font-medium text-slate-500 text-left p-4 pr-6">상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(req => (
                                        <tr key={req.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 pl-6 text-slate-600 font-mono text-[13px]">{new Date(req.created_at).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="p-4 font-bold text-slate-800">{req.amount.toLocaleString()} C</td>
                                            <td className="p-4 text-slate-600">
                                                {METHODS.find(m => m.id === req.method)?.label || req.method}
                                            </td>
                                            <td className="p-4 pr-6">
                                                {translateStatus(req.status)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
