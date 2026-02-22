'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthCompany } from '@/lib/supabase/auth-context'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types'
import { sendPushToAdmins } from '@/actions/push'

// ============================================
// 업체 관리
// ============================================

/** 업체 코드로 회사 검색 (업체이름#코드 또는 #코드) */
export async function searchCompanyByCode(input: string) {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { found: false, error: '인증 실패' }

    // 입력에서 # 기준으로 코드 추출
    let searchCode = input.trim()
    const hashIndex = input.lastIndexOf('#')
    if (hashIndex !== -1) {
        searchCode = input.substring(hashIndex + 1).trim()
    }

    // 숫자만 추출
    searchCode = searchCode.replace(/[^0-9]/g, '')
    if (searchCode.length !== 4) return { found: false, error: '4자리 코드를 입력하세요. (예: 클린체크#0000)' }

    const { data, error } = await supabase
        .from('companies')
        .select('id, name, sharing_enabled, code')
        .eq('code', searchCode)

    if (error) {
        console.error('searchCompanyByCode error:', error)
        return { found: false, error: error.message }
    }

    if (!data || data.length === 0) {
        return { found: false, error: '존재하지 않는 업체입니다.' }
    }

    const company = data[0]
    if (company.id === companyId) {
        return { found: false, error: '자사 업체는 등록할 수 없습니다.' }
    }

    return { found: true, company }
}

/** 업체 공유 활성화 (등록) */
export async function enableCompanySharing(targetCompanyId: string): Promise<ActionResponse> {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    const { error } = await supabase
        .from('companies')
        .update({ sharing_enabled: true })
        .eq('id', targetCompanyId)

    if (error) {
        console.error('enableCompanySharing error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/partners')
    return { success: true }
}

/** 업체 공유 비활성화 (제거) */
export async function disableCompanySharing(targetCompanyId: string): Promise<ActionResponse> {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    const { error } = await supabase
        .from('companies')
        .update({ sharing_enabled: false })
        .eq('id', targetCompanyId)

    if (error) {
        console.error('disableCompanySharing error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/partners')
    return { success: true }
}

/** 공유 활성화된 업체 목록 (자사 제외) */
export async function getSharingPartners() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data, error } = await supabase
        .from('companies')
        .select('id, name, sharing_enabled, code')
        .eq('sharing_enabled', true)
        .neq('id', companyId)
        .order('name')

    if (error) {
        console.error('getSharingPartners error:', error)
        return []
    }
    return data || []
}

/** 내 업체 코드 조회 */
export async function getMyCompanyCode() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return null

    const { data } = await supabase
        .from('companies')
        .select('id, name, code')
        .eq('id', companyId)
        .single()

    if (!data) return null
    return { code: data.code || '????', name: data.name, id: data.id }
}

// ============================================
// 오더 등록/관리 (발신 업체)
// ============================================

interface CreateOrderData {
    region: string
    work_date: string
    area_size: string
    notes?: string
    address?: string
    customer_phone?: string
    customer_name?: string
}

/** 오더 등록 */
export async function createSharedOrder(data: CreateOrderData): Promise<ActionResponse> {
    const { supabase, user, companyId } = await getAuthCompany()
    if (!companyId || !user) return { success: false, error: '인증 실패' }

    const { error } = await supabase
        .from('shared_orders')
        .insert({
            company_id: companyId,
            created_by: user.id,
            region: data.region,
            work_date: data.work_date,
            area_size: data.area_size,
            notes: data.notes || null,
            address: data.address || null,
            customer_phone: data.customer_phone || null,
            customer_name: data.customer_name || null,
            status: 'open'
        })

    if (error) {
        console.error('createSharedOrder error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/shared-orders')
    return { success: true }
}

/** 내가 등록한 오더 목록 */
export async function getMySharedOrders() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data, error } = await supabase
        .from('shared_orders')
        .select('*, accepted_company:accepted_by(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getMySharedOrders error:', error)
        return []
    }
    return data || []
}

/** 수신 오더 목록 (open 상태, 내 업체 제외) */
export async function getIncomingOrders() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    // 내 업체가 공유 활성화됐는지 확인
    const { data: myCompany } = await supabase
        .from('companies')
        .select('sharing_enabled')
        .eq('id', companyId)
        .single()

    if (!myCompany?.sharing_enabled) return []

    const { data, error } = await supabase
        .from('shared_orders')
        .select('*, sender_company:company_id(name)')
        .eq('status', 'open')
        .neq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getIncomingOrders error:', error)
        return []
    }
    return data || []
}

/** 오더 수락 */
export async function acceptOrder(orderId: string): Promise<ActionResponse> {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    // 1. 오더 정보 조회
    const { data: order, error: fetchError } = await supabase
        .from('shared_orders')
        .select('*')
        .eq('id', orderId)
        .eq('status', 'open')
        .single()

    if (fetchError || !order) {
        return { success: false, error: '오더를 찾을 수 없거나 이미 수락되었습니다.' }
    }

    // 2. 수락 처리
    const hasDetails = order.address && order.customer_phone
    const newStatus = hasDetails ? 'transferred' : 'accepted'

    const { error: updateError } = await supabase
        .from('shared_orders')
        .update({
            accepted_by: companyId,
            accepted_at: new Date().toISOString(),
            status: newStatus
        })
        .eq('id', orderId)

    if (updateError) {
        console.error('acceptOrder error:', updateError)
        return { success: false, error: updateError.message }
    }

    // 3. 업체명 조회
    const { data: myCompany } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()
    const companyName = myCompany?.name || '업체'

    // 4. 상세정보 있으면 현장 자동 이관
    if (hasDetails) {
        await transferToSite(order, companyId, supabase)

        // 발신 업체에 알림
        await sendPushToAdmins(order.company_id, {
            title: '오더 수락 완료',
            body: `${companyName}에서 오더를 수락하였습니다.`,
            url: '/admin/shared-orders',
            tag: `order-accepted-${orderId}`
        })
    } else {
        // 상세 정보 없음 → 발신 업체에 정보 입력 요청
        await sendPushToAdmins(order.company_id, {
            title: '오더 수락 - 상세정보 필요',
            body: `${companyName}에서 오더를 수락하였습니다. 상세 정보(주소/연락처)를 입력해주세요.`,
            url: '/admin/shared-orders',
            tag: `order-info-needed-${orderId}`
        })
    }

    // 알림 기록 저장
    await supabase.from('shared_order_notifications').insert({
        order_id: orderId,
        company_id: order.company_id,
        message: hasDetails
            ? `${companyName}에서 오더를 수락하였습니다.`
            : `${companyName}에서 오더를 수락하였습니다. 상세 정보(주소/연락처)를 입력해주세요.`
    })

    revalidatePath('/admin/shared-orders')
    return { success: true }
}

/** 오더 상세정보 업데이트 (발신 업체가 주소/연락처 추가) */
export async function updateOrderDetails(
    orderId: string,
    address: string,
    customerPhone: string,
    customerName?: string
): Promise<ActionResponse> {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    // 1. 오더 정보 조회 (내 오더인지 확인)
    const { data: order, error: fetchError } = await supabase
        .from('shared_orders')
        .select('*')
        .eq('id', orderId)
        .eq('company_id', companyId)
        .single()

    if (fetchError || !order) {
        return { success: false, error: '오더를 찾을 수 없습니다.' }
    }

    // 2. 상세정보 업데이트
    const { error: updateError } = await supabase
        .from('shared_orders')
        .update({
            address,
            customer_phone: customerPhone,
            customer_name: customerName || null
        })
        .eq('id', orderId)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    // 3. 수락 상태이면 자동 이관
    if (order.status === 'accepted' && order.accepted_by) {
        const updatedOrder = { ...order, address, customer_phone: customerPhone, customer_name: customerName || null }
        await transferToSite(updatedOrder, order.accepted_by, supabase)

        // 상태를 transferred로 변경
        await supabase
            .from('shared_orders')
            .update({ status: 'transferred' })
            .eq('id', orderId)

        // 수신 업체에 알림
        const { data: senderCompany } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .single()

        await sendPushToAdmins(order.accepted_by, {
            title: '오더 이관 완료',
            body: `${senderCompany?.name || '업체'}에서 상세 정보를 입력하여 현장 관리로 이관되었습니다.`,
            url: '/admin/sites',
            tag: `order-transferred-${orderId}`
        })

        // 알림 기록
        await supabase.from('shared_order_notifications').insert({
            order_id: orderId,
            company_id: order.accepted_by,
            message: `상세 정보가 입력되어 현장 관리로 자동 이관되었습니다.`
        })
    }

    revalidatePath('/admin/shared-orders')
    return { success: true }
}

/** 오더 취소 */
export async function cancelSharedOrder(orderId: string): Promise<ActionResponse> {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    const { error } = await supabase
        .from('shared_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .eq('company_id', companyId)
        .in('status', ['open'])

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/shared-orders')
    return { success: true }
}

/** 알림 목록 조회 */
export async function getOrderNotifications() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data, error } = await supabase
        .from('shared_order_notifications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('getOrderNotifications error:', error)
        return []
    }
    return data || []
}

/** 알림 읽음 처리 */
export async function markNotificationsRead(): Promise<ActionResponse> {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    const { error } = await supabase
        .from('shared_order_notifications')
        .update({ is_read: true })
        .eq('company_id', companyId)
        .eq('is_read', false)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

// ============================================
// 내부 헬퍼: 현장 관리로 이관
// ============================================

async function transferToSite(order: any, receivingCompanyId: string, supabase: any) {
    try {
        // 발신 업체명 조회
        const { data: senderCompany } = await supabase
            .from('companies')
            .select('name')
            .eq('id', order.company_id)
            .single()

        const { data: site, error } = await supabase
            .from('sites')
            .insert({
                company_id: receivingCompanyId,
                name: order.customer_name || `${order.region} 현장`,
                address: order.address,
                customer_name: order.customer_name || null,
                customer_phone: order.customer_phone || null,
                cleaning_date: order.work_date,
                area_size: order.area_size,
                special_notes: order.notes
                    ? `[오더 공유: ${senderCompany?.name || '타업체'}] ${order.notes}`
                    : `[오더 공유: ${senderCompany?.name || '타업체'}]`,
                status: 'scheduled',
                payment_status: 'none',
                collection_type: 'company'
            })
            .select('id')
            .single()

        if (error) {
            console.error('transferToSite insert error:', error)
            return null
        }

        // shared_orders에 이관된 site_id 기록
        if (site) {
            await supabase
                .from('shared_orders')
                .update({ transferred_site_id: site.id })
                .eq('id', order.id)
        }

        return site
    } catch (err) {
        console.error('transferToSite error:', err)
        return null
    }
}
