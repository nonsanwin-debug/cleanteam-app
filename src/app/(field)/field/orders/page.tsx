import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FieldOrdersClient } from './orders-client'
import { getMySharedOrders } from '@/actions/shared-orders'

export const dynamic = 'force-dynamic'

export default async function FieldOrdersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/partner-login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'partner') {
        redirect('/auth/partner-login')
    }

    const orders = await getMySharedOrders()

    return <FieldOrdersClient initialOrders={orders} />
}
