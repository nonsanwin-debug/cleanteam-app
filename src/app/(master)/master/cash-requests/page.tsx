import { Metadata } from 'next'
import { getCashRequests } from '@/actions/cash'
import { CashRequestsClient } from './cash-requests-client'

export const metadata: Metadata = {
    title: '캐쉬 충전 관리 | NEXUS Master',
}

export const dynamic = 'force-dynamic'

export default async function MasterCashRequestsPage() {
    const { data: requests } = await getCashRequests()

    return <CashRequestsClient initialRequests={requests || []} />
}
