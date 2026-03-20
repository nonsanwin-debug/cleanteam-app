import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FieldBookClient } from './book-client'

export const dynamic = 'force-dynamic'

export default async function FieldBookPage() {
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

    return <FieldBookClient />
}
