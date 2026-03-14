import { RealtimeSubscriber } from '@/components/admin/realtime-subscriber'
import { MobileNav } from '@/components/admin/mobile-nav'
import { AdminNavLinks } from '@/components/admin/admin-nav-links'
import { createClient } from '@/lib/supabase/server'
import { getPendingWithdrawalCount } from '@/actions/admin'
import { LogoutButton } from '@/components/auth/logout-button'
import { PushSubscriber } from '@/components/PushSubscriber'
import Image from 'next/image'
import Link from 'next/link'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Get user info
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let displayName = '관리자'
    let companyPoints = 0

    if (user) {
        // Fetch user profile with company info in a single join
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('name, role, company_id, companies(name, code, status, points)')
            .eq('id', user.id)
            .single()

        console.log('🔍 AdminLayout Data:', { profile, profileError, userId: user.id })

        if (profile) {
            // Check if profile.company_id exists but companies join result is null (RLS Issue)
            const companyData = (profile as any).companies
            let company = Array.isArray(companyData) ? companyData[0] : companyData

            // Double check if join failed but company_id exists
            if (!company && profile.company_id) {
                console.warn('⚠️ Link to company exists but data not fetched. Checking RLS...')
                const { data: directCompany } = await supabase
                    .from('companies')
                    .select('name, code, status, points')
                    .eq('id', profile.company_id)
                    .single()
                if (directCompany) company = directCompany
            }

            if (company && company.name && company.code) {
                displayName = `${company.name}#${company.code} 관리자`
            } else if (profile.name) {
                displayName = `${profile.name} 관리자`
            } else {
                displayName = `관리자`
            }

            // Company Status Check
            if (company && company.status === 'pending') {
                return (
                    <div className="flex h-screen bg-slate-100 items-center justify-center p-4">
                        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
                            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-3xl">⏳</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">승인 대기 중입니다</h1>
                                <p className="text-slate-500 mt-2 mt-4 text-sm whitespace-pre-line">
                                    NEXUS 시스템 심사가 진행 중입니다.{"\n"}
                                    최고 관리자의 승인 완료 후부터{"\n"}모든 관리자 기능을 사용하실 수 있습니다.
                                </p>
                            </div>
                            <LogoutButton redirectTo="/auth/admin-login" variant="outline" className="w-full mt-4 text-red-500 border-red-200 hover:bg-red-50" />
                        </div>
                    </div>
                )
            } else if (company && company.status === 'rejected') {
                return (
                    <div className="flex h-screen bg-slate-100 items-center justify-center p-4">
                        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-3xl">🚫</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">가입이 반려되었습니다</h1>
                                <p className="text-slate-500 mt-2 mt-4 text-sm whitespace-pre-line">
                                    업체 승인이 거절되었습니다. 최고 관리자에게 문의하세요.
                                </p>
                            </div>
                            <LogoutButton redirectTo="/auth/admin-login" variant="outline" className="w-full mt-4 text-red-500 border-red-200 hover:bg-red-50" />
                        </div>
                    </div>
                )
            }
            
            companyPoints = profile?.companies ? (Array.isArray(profile.companies) ? profile.companies[0]?.points : (profile.companies as any)?.points) : 0;
        }
    }

    // Get pending withdrawal count
    const pendingCount = await getPendingWithdrawalCount()
    
    // Get unread inquiry replies
    const { getUnreadReplyCount } = await import('@/actions/inquiries')
    const unreadReplyCount = await getUnreadReplyCount()


    return (
        <div className="flex h-screen bg-slate-100">
            <RealtimeSubscriber />
            <PushSubscriber />
            {/* Sidebar (Desktop) */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <Link href="/admin/dashboard" className="text-xl font-bold text-slate-900 flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Image src="/logos/N.png" alt="NEXUS" width={28} height={28} className="object-contain" />
                        NEXUS
                    </Link>
                    <div className="mt-3 space-y-1">
                        <p className="text-sm font-semibold text-primary break-keep">{displayName}님 반갑습니다</p>
                        <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-blue-50 text-blue-800 font-bold rounded-md mt-2">
                           <span>잔여 포인트</span>
                           <span>{companyPoints?.toLocaleString() || 0} P</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex-1">
                    <AdminNavLinks pendingCount={pendingCount} unreadReplyCount={unreadReplyCount} />
                </div>

                <div className="p-4 border-t border-slate-100">
                    <LogoutButton redirectTo="/auth/admin-login" variant="outline" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100" />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                <MobileNav displayName={displayName}>
                    <div className="flex flex-col h-full">
                        <div className="p-4 flex-1">
                            <AdminNavLinks pendingCount={pendingCount} unreadReplyCount={unreadReplyCount} />
                        </div>
                        <div className="p-4 border-t mt-auto mb-10">
                            <LogoutButton redirectTo="/auth/admin-login" variant="outline" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100" />
                        </div>
                    </div>
                </MobileNav>
                <div className="p-4 md:p-6">
                    {children}
                </div>


            </main>
        </div>
    )
}
