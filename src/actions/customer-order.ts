'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const REGION_SHORT: Record<string, string> = {
    '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구',
    '인천광역시': '인천', '광주광역시': '광주', '대전광역시': '대전',
    '울산광역시': '울산', '세종특별자치시': '세종', '경기도': '경기',
    '강원특별자치도': '강원', '충청북도': '충북', '충청남도': '충남',
    '전북특별자치도': '전북', '전라남도': '전남', '경상북도': '경북',
    '경상남도': '경남', '제주특별자치도': '제주',
}

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
    is_auto_assign: boolean
}) {
    const supabase = createAdminClient()

    // 파트너의 company_id 조회
    const { data: partner } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', data.partner_id)
        .single()

    // 주소에서 지역 추출 (시/도 + 시/군/구)
    const addressParts = data.address.split(' ')
    const province = addressParts[0] || ''
    const city = addressParts[1] || ''
    const shortProv = REGION_SHORT[province] || province
    const region = city ? `${shortProv} ${city}` : shortProv

    const { data: inserted, error } = await supabase.from('shared_orders').insert({
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
        is_auto_assign: data.is_auto_assign,
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
    }).select('id').single()

    if (error) {
        console.error('Customer order insert error:', error)
        return { success: false, error: error.message }
    }

    return { success: true, orderId: inserted?.id }
}
