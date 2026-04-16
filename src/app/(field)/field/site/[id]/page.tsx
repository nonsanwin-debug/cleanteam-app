import { PartnerSiteDetail } from '@/components/field/partner-site-detail'

type Props = {
    params: Promise<{ id: string }>
}

export default async function PartnerSitePage({ params }: Props) {
    const resolvedParams = await params
    return <PartnerSiteDetail siteId={resolvedParams.id} />
}
