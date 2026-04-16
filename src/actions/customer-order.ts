'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function createCustomerOrder(data: {
    address: string
    area_size: string
    customer_name: string
    customer_phone: string
    cleaning_type: string
    work_date: string
    time_preference: string | null
    residential_type: string | null
    structure_type: string | null
    building_condition: string
    notes: string | null
    photos: string[] | null
    partner_id: string
    reward_type: string
    estimated_price: number | null
}) {
    const supabase = createAdminClient()

    const { error } = await supabase.from('shared_orders').insert({
        ...data,
        status: 'pending',
        source: 'customer_link',
    })

    if (error) {
        console.error('Customer order insert error:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
