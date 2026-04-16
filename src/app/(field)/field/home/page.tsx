import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FieldHomeClient } from './home-client'
import { getPartnerFeedSites } from '@/actions/partner-feed'

export const dynamic = 'force-dynamic'

export default async function FieldHomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/partner-login')
    }

    // Fetch user profile to get partner name
    const { data: profile } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'partner') {
        redirect('/auth/partner-login')
    }

    // NEXUS 전체 현장 피드 조회
    const feedSites = await getPartnerFeedSites()

    return <FieldHomeClient 
        partnerName={profile.name} 
        feedSites={feedSites}
    />
}
