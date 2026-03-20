'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, LogOut, Phone, Mail, Award, Info } from 'lucide-react'
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
                            <h2 className="text-xl font-bold text-slate-800">{profile.name} <span className="text-sm font-medium text-slate-500">부동산 대표님</span></h2>
                            
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
                                <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                                    누적 리워드 (예상) <Info className="w-3 h-3 text-slate-400" />
                                </span>
                                <span className="text-2xl font-extrabold text-slate-800">
                                    {stats.estimatedRevenue.toLocaleString()}원
                                </span>
                            </div>
                        </div>
                        
                        <p className="text-xs text-slate-400 text-center px-4 leading-relaxed">
                            실제 정산 금액은 청소 규모 및 특이사항에 따라 달라질 수 있으며, 매월 말일 일괄 정산됩니다.
                        </p>
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
        </div>
    )
}
