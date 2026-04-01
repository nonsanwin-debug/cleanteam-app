import { Metadata } from 'next'
import { getPointExchanges } from '@/actions/master-exchanges'
import { PointExchangesClient } from './point-exchanges-client'

export const metadata: Metadata = {
    title: '포인트 교환 관리 | NEXUS Master',
}

export const dynamic = 'force-dynamic'

export default async function MasterPointExchangesPage() {
    const { data: requests } = await getPointExchanges()

    return <PointExchangesClient initialRequests={requests || []} />
}
