import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RechargeClient } from './recharge-client'

export const metadata: Metadata = {
    title: '캐쉬 충전 | 🅝 NEXUS',
}

export default async function RechargePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/admin-login')
    }

    // Get user's company info
    const { data: profile } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        redirect('/admin/dashboard')
    }

    const { data: company } = await supabase
        .from('companies')
        .select('cash, points')
        .eq('id', profile.company_id)
        .single()

    // Fetch recent recharge requests
    const { data: recentRequests } = await supabase
        .from('cash_requests')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(5)

    return (
        <RechargeClient
            currentCash={company?.cash || 0}
            currentPoints={company?.points || 0}
            requests={recentRequests || []}
        />
    )
}
