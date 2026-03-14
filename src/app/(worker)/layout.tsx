import Link from 'next/link'
import Image from 'next/image'
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
            <header 
                className="bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10"
                style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}
            >
                <Link href="/worker/home" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="worker-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#4F46E5" />
                                <stop offset="100%" stopColor="#22D3EE" />
                            </linearGradient>
                            <linearGradient id="worker-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22D3EE" />
                                <stop offset="100%" stopColor="#10B981" />
                            </linearGradient>
                            <linearGradient id="worker-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#BEF264" />
                            </linearGradient>
                        </defs>
                        <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#worker-grad-1)" />
                        <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#worker-grad-3)" />
                        <path d="M5.25 4.75L18.75 19.25" stroke="url(#worker-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                    </svg>
                    <h1 className="font-extrabold text-slate-800 tracking-tighter text-lg pt-0.5">NEXUS</h1>
                </Link>
                <LogoutButton variant="ghost" showText={true} className="text-sm text-slate-500 hover:text-red-500 p-0 h-auto" redirectTo="/" />
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
                {children}
            </main>

            {/* 글로벌 업로드 진행 인디케이터 */}
            <UploadIndicator />

            {/* Bottom Navigation (Mobile) */}
            <nav 
                className="bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 flex items-stretch justify-around z-10"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)', minHeight: 'calc(4rem + env(safe-area-inset-bottom))' }}
            >
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
