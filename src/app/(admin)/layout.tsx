import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LayoutDashboard, CheckSquare, Settings, LogOut, Users, MapPin, AlertCircle, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { RealtimeSubscriber } from '@/components/admin/realtime-subscriber'
import { createClient } from '@/lib/supabase/server'
import { getPendingWithdrawalCount } from '@/actions/admin'
import { LogoutButton } from '@/components/auth/logout-button'

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
        // Fetch user profile with company info in a single join
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('name, role, company_id, companies(name, code)')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('❌ AdminLayout Profile Fetch Error:', profileError)
        }

        if (profile) {
            // Safe access to join data
            const companyData = (profile as any).companies
            const company = Array.isArray(companyData) ? companyData[0] : companyData

            if (company && company.name && company.code) {
                displayName = `${company.name}#${company.code}`
            } else if (profile.name) {
                displayName = profile.name
            } else {
                displayName = `${profile.role === 'admin' ? '관리자' : '팀원'}`
            }
        }
    }

    // Get pending withdrawal count
    const pendingCount = await getPendingWithdrawalCount()

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
                <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50 relative">
                    <Users className="mr-2 h-4 w-4" />
                    사용자 관리
                    {pendingCount > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white hover:bg-red-600 h-5 min-w-5 flex items-center justify-center px-1.5">
                            {pendingCount}
                        </Badge>
                    )}
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
                    <LogoutButton redirectTo="/auth/admin-login" variant="outline" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100" />
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
                                    <LogoutButton redirectTo="/auth/admin-login" variant="outline" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100" />
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </header>
                <div className="p-4 md:p-6">
                    {children}
                </div>


            </main>
        </div>
    )
}
