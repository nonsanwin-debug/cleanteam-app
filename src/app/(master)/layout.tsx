import { LogoutButton } from '@/components/auth/logout-button'
import { MasterNavLinks } from '@/components/master/master-nav-links'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileNav } from '@/components/admin/mobile-nav'

export default async function MasterLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Get user info
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/admin-login')
    }

    // Verify master role
    const { data: profile } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()
        
    if (!profile || profile.role !== 'master') {
        redirect('/admin/dashboard')
    }

    const displayName = 'NEXUS 시스템 마스터'
    const { getPendingInquiryCount } = await import('@/actions/inquiries')
    const pendingInquiriesCount = await getPendingInquiryCount()

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Sidebar (Desktop) */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col text-white">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-black text-white tracking-widest">NEXUS MASTER</h1>
                    <div className="mt-3 space-y-1">
                        <p className="text-sm font-semibold text-indigo-400">{displayName}님 접속중</p>
                    </div>
                </div>

                <div className="p-4 flex-1">
                    <MasterNavLinks pendingInquiriesCount={pendingInquiriesCount} />
                </div>

                <div className="p-4 border-t border-slate-800">
                    <LogoutButton redirectTo="/auth/admin-login" variant="outline" className="w-full justify-start text-red-400 hover:text-white hover:bg-red-600 border-red-900 bg-slate-800" />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                <MobileNav displayName={displayName}>
                    <div className="flex flex-col h-full bg-slate-900">
                        <div className="p-4 flex-1">
                            <MasterNavLinks pendingInquiriesCount={pendingInquiriesCount} />
                        </div>
                        <div className="p-4 border-t border-slate-800 mt-auto mb-10">
                            <LogoutButton redirectTo="/auth/admin-login" variant="outline" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 border-red-100 bg-white" />
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
