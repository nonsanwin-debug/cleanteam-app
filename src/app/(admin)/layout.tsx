import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, CheckSquare, Settings, LogOut, Users, MapPin } from 'lucide-react'

import { RealtimeSubscriber } from '@/components/admin/realtime-subscriber'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-slate-100">
            <RealtimeSubscriber />
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-bold text-slate-800">Clean Admin</h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/admin/dashboard">
                        <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            대시보드
                        </Button>
                    </Link>
                    <Link href="/admin/sites">
                        <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50">
                            <MapPin className="mr-2 h-4 w-4" />
                            현장 관리
                        </Button>
                    </Link>
                    <Link href="/admin/checklists">
                        <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50">
                            <CheckSquare className="mr-2 h-4 w-4" />
                            체크리스트 관리
                        </Button>
                    </Link>
                    <Link href="/admin/users">
                        <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50">
                            <Users className="mr-2 h-4 w-4" />
                            사용자 관리
                        </Button>
                    </Link>
                    <Link href="/admin/settings">
                        <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50">
                            <Settings className="mr-2 h-4 w-4" />
                            설정
                        </Button>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <Link href="/auth/login">
                        <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50">
                            <LogOut className="mr-2 h-4 w-4" />
                            로그아웃
                        </Button>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:hidden">
                    <h1 className="text-lg font-bold">Clean Admin</h1>
                    {/* Mobile Menu Trigger could go here */}
                </header>
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}
