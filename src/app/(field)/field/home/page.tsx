import { createClient } from '@/lib/supabase/server'
import { FieldHomeClient } from './home-client'
import { getPartnerFeedSites } from '@/actions/partner-feed'
import { getActiveNotices } from '@/actions/partner-notices'

export const dynamic = 'force-dynamic'

export default async function FieldHomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let partnerName = ''
    let isLoggedIn = false

    if (user) {
        const { data: profile } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', user.id)
            .single()

        if (profile?.role === 'partner') {
            partnerName = profile.name
            isLoggedIn = true
        }
    }

    const [feedSites, notices] = await Promise.all([
        getPartnerFeedSites(),
        getActiveNotices(),
    ])

    return <FieldHomeClient 
        partnerName={partnerName}
        feedSites={feedSites}
        notices={notices}
        isLoggedIn={isLoggedIn}
    />
}
