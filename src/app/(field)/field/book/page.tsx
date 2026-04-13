import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FieldBookClient } from './book-client'

export const dynamic = 'force-dynamic'

export default async function FieldBookPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/partner-login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('name, phone, role, companies(benefits)')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'partner') {
        redirect('/auth/partner-login')
    }

    // Extract benefits carefully just in case companies array or object format from Supabase
    let partnerBenefits = {}
    if (profile?.companies) {
        if (Array.isArray(profile.companies)) {
            partnerBenefits = profile.companies[0]?.benefits || {}
        } else {
            partnerBenefits = (profile.companies as any).benefits || {}
        }
    }

    return <FieldBookClient partnerName={profile?.name || ''} partnerPhone={profile?.phone || ''} partnerBenefits={partnerBenefits} />
}
