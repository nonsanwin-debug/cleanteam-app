import { ShareView } from '@/components/customer/share-view'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus.xn--mk1bu44c'
    const ogImage = `${siteUrl}/logos/Real-NEXUS-Logo.png`

    // Try server fetch for metadata (best effort)
    try {
        const supabase = await createClient()
        const { data: site } = await supabase.from('sites').select('name').eq('id', resolvedParams.id).single()
        if (site) {
            return {
                title: `${site.name} - 작업 보고서 | 🅝 NEXUS`,
                description: '현장 작업 사진 및 완료 내역을 확인하세요.',
                openGraph: {
                    title: `${site.name} - 작업 보고서 | 🅝 NEXUS`,
                    description: '현장 작업 사진 및 완료 내역을 확인하세요.',
                    images: [{ url: ogImage, width: 1024, height: 1024, alt: 'NEXUS Logo' }],
                    type: 'website',
                },
                twitter: {
                    card: 'summary',
                    title: `${site.name} - 작업 보고서 | 🅝 NEXUS`,
                    description: '현장 작업 사진 및 완료 내역을 확인하세요.',
                    images: [ogImage],
                },
            }
        }
    } catch (e) { }

    return {
        title: '🅝 NEXUS 작업 보고서',
        description: '현장 작업 사진 및 완료 내역을 확인하세요.',
        openGraph: {
            title: '🅝 NEXUS 작업 보고서',
            description: '현장 작업 사진 및 완료 내역을 확인하세요.',
            images: [{ url: ogImage, width: 1024, height: 1024, alt: 'NEXUS Logo' }],
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title: '🅝 NEXUS 작업 보고서',
            description: '현장 작업 사진 및 완료 내역을 확인하세요.',
            images: [ogImage],
        },
    }
}

export default async function SharePage({ params }: Props) {
    const resolvedParams = await params
    return <ShareView siteId={resolvedParams.id} />
}
