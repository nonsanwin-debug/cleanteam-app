'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, LogOut, Phone, Mail, Award, Info, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { exchangeNaverPayPoints } from '@/actions/points'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useState } from 'react'

export function FieldProfileClient({ 
    profile, 
    stats 
}: { 
    profile: { id: string, name: string, email: string, phone: string, role: string },
    stats: { totalCompleted: number, estimatedRevenue: number }
}) {
    const router = useRouter()
    const supabase = createClient()
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [isExchangeOpen, setIsExchangeOpen] = useState(false)
    const [exchangeAmount, setExchangeAmount] = useState('')
    const [isExchanging, setIsExchanging] = useState(false)

    const handleExchange = async () => {
        const amount = parseInt(exchangeAmount) || 0
        if (amount <= 0) {
            toast.error('교환할 금액을 올바르게 입력해주세요.')
            return
        }
        if (amount > stats.estimatedRevenue) {
            toast.error('보유한 포인트보다 많은 금액은 교환할 수 없습니다.')
            return
        }

        setIsExchanging(true)
        const result = await exchangeNaverPayPoints(amount)
        setIsExchanging(false)

        if (result.success) {
            toast.success(`${amount.toLocaleString()} P 네이버페이 교환 신청이 완료되었습니다!`)
            setIsExchangeOpen(false)
            setExchangeAmount('')
            // UI state refresh will be handled automatically by revalidatePath in the action
        } else {
            toast.error('교환 실패', { description: result.error })
        }
    }

    const handleLogout = async () => {
        setIsLoggingOut(true)
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error('로그아웃 실패', { description: error.message })
            setIsLoggingOut(false)
        } else {
            toast.success('로그아웃 되었습니다.')
            router.push('/auth/partner-login')
            router.refresh()
        }
    }

    return (
        <div className="flex flex-col min-h-screen pb-20 bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between">
                <div className="font-bold text-slate-800 text-lg">내 정보 관리</div>
            </header>

            <main className="flex-1 p-4 space-y-6">
                
                {/* Profile Card */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <div className="bg-teal-600 h-24"></div>
                    <CardContent className="px-5 pb-6 pt-0 relative">
                        <div className="absolute -top-10 left-5 w-20 h-20 bg-white rounded-full p-1 shadow-sm">
                            <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                                <User className="w-8 h-8 text-teal-600" />
                            </div>
                        </div>
                        
                        <div className="pt-12">
                            <h2 className="text-xl font-bold text-slate-800">{profile.name} <span className="text-sm font-medium text-slate-500">파트너님</span></h2>
                            
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone className="w-4 h-4 text-teal-600" />
                                    <span className="text-sm">{profile.phone || '연락처 미등록'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail className="w-4 h-4 text-teal-600" />
                                    <span className="text-sm">{profile.email}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance / Revenue Stats */}
                <Card className="border-none shadow-sm">
                    <CardContent className="p-5">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Award className="w-5 h-5 text-teal-600" /> 나의 활동 현황
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-teal-50 rounded-xl p-4 flex flex-col items-center justify-center">
                                <span className="text-xs text-teal-800 font-medium mb-1">성공한 예약 건수</span>
                                <span className="text-2xl font-extrabold text-teal-700">{stats.totalCompleted}건</span>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100">
                                <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                                    NEXUS 파트너즈 활동 포인트 
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="focus:outline-none ml-0.5">
                                                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="top" className="w-72 text-xs text-slate-700 leading-relaxed shadow-md border-slate-200">
                                            예약 현장 완료 시 총 견적금액의 10%를 <br />
                                            <span className="font-semibold text-teal-600">파트너즈 활동 포인트</span>로 지급합니다<br />
                                            활동포인트는 네이버페이로 교환가능합니다
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <span className="text-2xl font-extrabold text-slate-800">
                                    {stats.estimatedRevenue.toLocaleString()} P
                                </span>
                            </div>
                        </div>
                        
                        <Button 
                            className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm h-11 font-bold text-base transition-colors"
                            onClick={() => setIsExchangeOpen(true)}
                            disabled={stats.estimatedRevenue <= 0}
                        >
                            네이버페이 포인트로 교환
                        </Button>
                    </CardContent>
                </Card>

                {/* Additional Actions */}
                <div className="pt-4 px-2 space-y-2">
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 h-12 rounded-xl text-base"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        로그아웃
                    </Button>
                </div>

            </main>

            {/* 네이버페이 포인트 교환 다이얼로그 */}
            <Dialog open={isExchangeOpen} onOpenChange={setIsExchangeOpen}>
                <DialogContent className="sm:max-w-md w-[95%]">
                    <DialogHeader>
                        <DialogTitle>네이버페이 포인트 교환</DialogTitle>
                        <DialogDescription>
                            보유하신 파트너즈 활동 포인트를 네이버페이 포인트로 교환 신청합니다.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                            <span className="text-sm text-slate-500 font-medium">현재 보유 포인트</span>
                            <span className="text-lg font-bold text-teal-700">{stats.estimatedRevenue.toLocaleString()} P</span>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="exchange-amount">교환할 포인트</Label>
                            <div className="relative">
                                <Input 
                                    id="exchange-amount"
                                    type="number"
                                    placeholder="0"
                                    className="pr-20 font-bold"
                                    value={exchangeAmount}
                                    onChange={(e) => setExchangeAmount(e.target.value)}
                                />
                                <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="sm"
                                    className="absolute right-1 top-1 h-7 text-xs font-semibold text-teal-600 hover:bg-teal-50"
                                    onClick={() => setExchangeAmount(stats.estimatedRevenue.toString())}
                                >
                                    전액
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsExchangeOpen(false)} disabled={isExchanging} className="w-full sm:w-auto">
                            취소
                        </Button>
                        <Button onClick={handleExchange} disabled={isExchanging || !exchangeAmount} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white">
                            {isExchanging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            교환 신청
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
