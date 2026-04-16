import { CustomerBookClient } from './customer-book-client'
import { getPlatformSettings } from '@/actions/platform-settings'

type Props = {
    params: Promise<{ partnerId: string }>
    searchParams: Promise<{ r?: string }>
}

export default async function CustomerBookPage({ params, searchParams }: Props) {
    const resolvedParams = await params
    const resolvedSearch = await searchParams
    const rewardType = resolvedSearch.r === 'discount' ? 'discount' : 'points'
    
    const globalSettings = await getPlatformSettings()

    return <CustomerBookClient 
        partnerId={resolvedParams.partnerId} 
        rewardType={rewardType}
        freeOldBuilding={!!globalSettings.global_free_old_building}
        freeInterior={!!globalSettings.global_free_interior}
    />
}
