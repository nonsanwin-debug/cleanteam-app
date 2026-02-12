import { RealtimeSubscriber } from '@/components/admin/realtime-subscriber'
import { MobileNav } from '@/components/admin/mobile-nav'
import { AdminNavLinks } from '@/components/admin/admin-nav-links'
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
                    .select('name, code')
                    .eq('id', profile.company_id)
                    .single()
                if (directCompany) company = directCompany
            }

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
                    <AdminNavLinks pendingCount={pendingCount} />
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
                            <AdminNavLinks pendingCount={pendingCount} />
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
