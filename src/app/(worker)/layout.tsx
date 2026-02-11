import Link from 'next/link'
import { CheckCircle2, Home, User } from 'lucide-react'
import { LogoutButton } from '@/components/auth/logout-button'

export default function WorkerLayout({
    children,
}: {
    children: React.ReactNode
}) {
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
