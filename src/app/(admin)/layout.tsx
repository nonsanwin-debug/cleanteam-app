import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, CheckSquare, Settings, LogOut, Users, MapPin, AlertCircle, Menu } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

import { RealtimeSubscriber } from '@/components/admin/realtime-subscriber'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Get user info
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let displayName = '관리자'

    if (user) {
        console.log('🔍 User ID:', user.id)

        // First, get user profile with company_id
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('name, company_id')
            .eq('id', user.id)
            .single()

        console.log('🔍 Profile:', profile)
        console.log('🔍 Profile Error:', profileError)

        if (profile) {
            // If user has a company_id, fetch the company name
            if (profile.company_id) {
                console.log('🔍 Company ID:', profile.company_id)

                const { data: company, error: companyError } = await supabase
                    .from('companies')
                    .select('name')
                    .eq('id', profile.company_id)
                    .single()

                console.log('🔍 Company:', company)
                console.log('🔍 Company Error:', companyError)

                displayName = company?.name || profile.name || '관리자'
            } else {
                console.log('🔍 No company_id found')
                displayName = profile.name || '관리자'
            }
        }

        console.log('🔍 Final displayName:', displayName)
    }

    const NavLinks = () => (
        <nav className="flex-1 space-y-1">
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
            <Link href="/admin/as-manage">
                <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    AS 관리
                </Button>
            </Link>
            <Link href="/admin/settings">
                <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50">
                    <Settings className="mr-2 h-4 w-4" />
                    설정
                </Button>
            </Link>
        </nav>
    )

    return (
        <div className="flex h-screen bg-slate-100">
            <RealtimeSubscriber />
            {/* Sidebar (Desktop) */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-bold text-slate-800">Clean Admin</h1>
                    <div className="mt-3 space-y-1">
                        <p className="text-sm font-semibold text-primary">{displayName}님 반갑습니다</p>
                    </div>
                </div>

                <div className="p-4 flex-1">
                    <NavLinks />
                </div>

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
            <main className="flex-1 overflow-auto relative">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:hidden">
                    <div>
                        <h1 className="text-lg font-bold">Clean Admin</h1>
                        <p className="text-xs text-primary">{displayName}님</p>
                    </div>

                    {/* Mobile Menu */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[80%] sm:w-[385px] p-0">
                            <SheetHeader className="p-6 border-b">
                                <SheetTitle className="text-left text-xl font-bold">Clean Admin</SheetTitle>
                                <div className="mt-2 space-y-1 text-left">
                                    <p className="text-sm font-semibold text-primary">{displayName}님 반갑습니다</p>
                                </div>
                            </SheetHeader>
                            <div className="flex flex-col h-full">
                                <div className="p-4 flex-1">
                                    <NavLinks />
                                </div>
                                <div className="p-4 border-t mt-auto mb-10">
                                    <Link href="/auth/login">
                                        <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            로그아웃
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </header>
                <div className="p-4 md:p-6">
                    {children}
                </div>

                {/* Debug Overlay */}
                <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white text-xs rounded-lg max-w-md overflow-auto z-50 shadow-lg">
                    <h3 className="font-bold mb-2 text-yellow-400">🔍 Admin Debug Info</h3>
                    <div className="space-y-1 font-mono">
                        <p>User ID: <span className="text-blue-300">{user?.id?.slice(0, 8)}...</span></p>
                        <p>Display Name: <span className="text-green-300">{displayName}</span></p>
                        <div className="border-t border-gray-600 my-2 pt-2">
                            <p className="text-gray-400 mb-1">Profile Data:</p>
                            <pre className="whitespace-pre-wrap text-[10px] text-gray-300">
                                {JSON.stringify({
                                    profile: user ? (await supabase.from('users').select('name, company_id').eq('id', user.id).single()).data : null,
                                    company_id: user ? (await supabase.from('users').select('company_id').eq('id', user.id).single()).data?.company_id : null,
                                }, null, 2)}
                            </pre>
                        </div>
                        <div className="border-t border-gray-600 my-2 pt-2">
                            <p className="text-gray-400 mb-1">Company Query Result:</p>
                            <pre className="whitespace-pre-wrap text-[10px] text-gray-300">
                                {JSON.stringify(
                                    user ? (
                                        (await supabase.from('users').select('company_id').eq('id', user.id).single()).data?.company_id
                                            ? (await supabase.from('companies').select('name').eq('id', (await supabase.from('users').select('company_id').eq('id', user.id).single()).data.company_id).single())
                                            : { message: "No company_id" }
                                    ) : { message: "No user" }
                                    , null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
