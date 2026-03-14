import { getAds } from '@/actions/ads'
import { MasterAdsClient } from './ads-client'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: '광고 관리 | NEXUS MASTER',
    description: '공유 페이지 배너 광고 및 통계 관리',
}

export const dynamic = 'force-dynamic'

export default async function MasterAdsPage() {
    // 1. Fetch data on server
    const result = await getAds()
    const ads = result.success ? (result.data || []) : []

    // 2. Pass to client component
    return <MasterAdsClient initialAds={ads} />
}
