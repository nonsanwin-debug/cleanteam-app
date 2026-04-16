import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FieldHomeClient } from './home-client'
import { getPartnerFeedSites } from '@/actions/partner-feed'
import { getActiveNotices } from '@/actions/partner-notices'

export const dynamic = 'force-dynamic'

export default async function FieldHomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/partner-login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'partner') {
        redirect('/auth/partner-login')
    }

    const [feedSites, notices] = await Promise.all([
        getPartnerFeedSites(),
        getActiveNotices(),
    ])

    return <FieldHomeClient 
        partnerName={profile.name} 
        feedSites={feedSites}
        notices={notices}
    />
}
