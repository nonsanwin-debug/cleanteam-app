import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FieldBookClient } from './book-client'
import { getPlatformSettings } from '@/actions/platform-settings'

export const dynamic = 'force-dynamic'

export default async function FieldBookPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/partner-login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('name, phone, role, companies(benefits, booking_points)')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'partner') {
        redirect('/auth/partner-login')
    }

    // Extract benefits carefully just in case companies array or object format from Supabase
    let partnerBenefits: any = {}
    let bookingPoints = 0
    if (profile?.companies) {
        const companyObj = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies;
        if (companyObj) {
            partnerBenefits = (companyObj as any).benefits || {}
            bookingPoints = (companyObj as any).booking_points || 0
        }
    }

    // 글로벌 전역 설정 조회 → 전역 할증 무료가 켜져 있으면 파트너 혜택에 병합
    const globalSettings = await getPlatformSettings()
    if (globalSettings.global_free_old_building) {
        partnerBenefits.free_old_building = true
    }
    if (globalSettings.global_free_interior) {
        partnerBenefits.free_interior = true
    }

    return <FieldBookClient partnerName={profile?.name || ''} partnerPhone={profile?.phone || ''} partnerBenefits={partnerBenefits} bookingPoints={bookingPoints} />
}
