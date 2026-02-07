'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function WorkerProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/')
        toast.success('로그아웃 되었습니다.')
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center">
                <User className="mr-2" />
                내 정보
            </h2>

            <Card>
                <CardHeader>
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="w-8 h-8 text-slate-500" />
                    </div>
                    <CardTitle className="text-center">현장 팀장</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-slate-500">소속</span>
                            <span className="font-medium">청소사업팀</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-slate-500">연락처</span>
                            <span className="font-medium">010-0000-0000</span>
                        </div>
                    </div>

                    <Button variant="destructive" className="w-full mt-6" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> 로그아웃
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
