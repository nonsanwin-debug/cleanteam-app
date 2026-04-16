import { getDeletedSites } from '@/actions/master'
import { DeletedOrdersClient } from './deleted-orders-client'

export const metadata = {
    title: 'NEXUS | 삭제 오더 관리',
}

export default async function DeletedOrdersPage() {
    const deletedSites = await getDeletedSites()

    return <DeletedOrdersClient initialSites={deletedSites} />
}
