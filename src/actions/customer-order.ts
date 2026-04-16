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

    // 파트너의 company_id 조회
    const { data: partner } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', data.partner_id)
        .single()

    // 주소에서 지역 추출 (첫 번째 단어)
    const region = data.address.split(' ')[0] || '미정'

    const { error } = await supabase.from('shared_orders').insert({
        company_id: partner?.company_id || null,
        created_by: data.partner_id,
        region: region,
        address: data.address,
        area_size: data.area_size,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        work_date: data.work_date,
        notes: data.notes || '',
        status: 'open',
        parsed_details: {
            cleaning_type: data.cleaning_type,
            time_preference: data.time_preference,
            residential_type: data.residential_type,
            structure_type: data.structure_type,
            building_condition: data.building_condition,
            reward_type: data.reward_type,
            estimated_price: data.estimated_price,
            source: 'customer_link',
            ...(data.photos && data.photos.length > 0 ? { image_urls: data.photos } : {}),
        },
    })

    if (error) {
        console.error('Customer order insert error:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
