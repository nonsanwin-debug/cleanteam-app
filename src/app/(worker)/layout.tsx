import Link from 'next/link'
import { CheckCircle2, Home, User } from 'lucide-react'
import { LogoutButton } from '@/components/auth/logout-button'
import { UploadIndicator } from '@/components/worker/upload-indicator'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function WorkerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // 역할 검증: 관리자는 워커 페이지 접근 불가
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role === 'admin') {
            redirect('/admin/dashboard')
        }
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
                <h1 className="font-bold text-slate-800">Clean Worker</h1>
                <LogoutButton variant="ghost" showText={true} className="text-sm text-slate-500 hover:text-red-500 p-0 h-auto" />
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 pb-20">
                {children}
            </main>

            {/* 글로벌 업로드 진행 인디케이터 */}
            <UploadIndicator />

            {/* Bottom Navigation (Mobile) */}
            <nav className="h-16 bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 flex items-center justify-around z-10 safe-area-bottom">
                <Link href="/worker/home" className="flex flex-col items-center justify-center w-full h-full text-primary">
                    <Home className="h-6 w-6" />
                    <span className="text-xs mt-1">홈</span>
                </Link>
                <Link href="/worker/schedule" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-primary">
                    <CheckCircle2 className="h-6 w-6" />
                    <span className="text-xs mt-1">일정</span>
                </Link>
                <Link href="/worker/profile" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-primary">
                    <User className="h-6 w-6" />
                    <span className="text-xs mt-1">내 정보</span>
                </Link>
            </nav>
        </div>
    )
}
