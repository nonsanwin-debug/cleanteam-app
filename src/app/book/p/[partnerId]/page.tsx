import { CustomerBookClient } from './customer-book-client'

type Props = {
    params: Promise<{ partnerId: string }>
    searchParams: Promise<{ r?: string }>
}

export default async function CustomerBookPage({ params, searchParams }: Props) {
    const resolvedParams = await params
    const resolvedSearch = await searchParams
    const rewardType = resolvedSearch.r === 'discount' ? 'discount' : 'points'
    
    return <CustomerBookClient partnerId={resolvedParams.partnerId} rewardType={rewardType} />
}
