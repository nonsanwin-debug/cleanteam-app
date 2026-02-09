import { ShareView } from '@/components/customer/share-view'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params
    // Try server fetch for metadata (best effort)
    try {
        const supabase = await createClient()
        const { data: site } = await supabase.from('sites').select('name').eq('id', resolvedParams.id).single()
        if (site) {
            return {
                title: `${site.name} - 작업 완료 보고서 | Clean Team`,
                description: '현장 작업 사진 및 완료 내역을 확인하세요.',
            }
        }
    } catch (e) { }

    return {
        title: 'Clean Team 작업 보고서',
        description: '현장 작업 사진 및 완료 내역을 확인하세요.',
    }
}

export default async function SharePage({ params }: Props) {
    const resolvedParams = await params
    return <ShareView siteId={resolvedParams.id} />
}
