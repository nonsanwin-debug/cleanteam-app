import { CustomerBookClient } from './customer-book-client'
import { getPlatformSettings } from '@/actions/platform-settings'
import { createAdminClient } from '@/lib/supabase/admin'

type Props = {
    params: Promise<{ partnerId: string }>
    searchParams: Promise<{ r?: string }>
}

export default async function CustomerBookPage({ params, searchParams }: Props) {
    const resolvedParams = await params
    const resolvedSearch = await searchParams
    const rewardType = resolvedSearch.r === 'discount' ? 'discount' : 'points'
    
    const globalSettings = await getPlatformSettings()

    // 파트너 이름 조회
    const adminClient = createAdminClient()
    const { data: partner } = await adminClient
        .from('users')
        .select('name, companies(name)')
        .eq('id', resolvedParams.partnerId)
        .single()
    
    const partnerName = partner?.companies 
        ? (Array.isArray(partner.companies) ? partner.companies[0]?.name : (partner.companies as any)?.name) || partner?.name || ''
        : partner?.name || ''

    return <CustomerBookClient 
        partnerId={resolvedParams.partnerId} 
        rewardType={rewardType}
        partnerName={partnerName}
        freeOldBuilding={!!globalSettings.global_free_old_building}
        freeInterior={!!globalSettings.global_free_interior}
    />
}
