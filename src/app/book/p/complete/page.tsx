import { createAdminClient } from '@/lib/supabase/admin'
import { CustomerOrderComplete } from './complete-client'

type Props = {
    searchParams: Promise<{ id?: string }>
}

export default async function CustomerBookCompletePage({ searchParams }: Props) {
    const { id } = await searchParams

    let order: any = null
    if (id) {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('shared_orders')
            .select('*')
            .eq('id', id)
            .single()
        order = data
    }

    return <CustomerOrderComplete order={order} />
}
