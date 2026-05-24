import { getSites } from '@/actions/sites'
import { AdminChatsClient } from '@/components/admin/admin-chats-client'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminChatsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/admin-login')
    }

    // Get user details
    const { data: profile } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

    // double check role
    if (profile?.role === 'partner') {
        redirect('/field/home')
    }
    if (profile?.role === 'worker') {
        redirect('/worker/home')
    }

    const adminName = profile?.name || '관리자'
    const adminId = user.id

    // Fetch all active sites for the admin's company
    const sites = await getSites()

    return (
        <div className="space-y-6">
            <AdminChatsClient
                sites={sites || []}
                adminName={adminName}
                adminId={adminId}
            />
        </div>
    )
}
