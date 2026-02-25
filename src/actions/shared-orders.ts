'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthCompany } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types'
import { sendPushToAdmins } from '@/actions/push'

// ============================================
// 업체 관리
// ============================================

/** 업체 코드로 회사 검색 (이름#코드: 이름+코드 필터, #코드 또는 코드: 코드만 검색) */
export async function searchCompanyByCode(input: string) {
    const { companyId } = await getAuthCompany()
    if (!companyId) return { found: false, error: '인증 실패', companies: [] }

    const adminSupabase = createAdminClient()

    // 입력 파싱: 이름#코드 또는 코드만
    let searchCode = input.trim()
    let searchName = ''
    const hashIndex = input.lastIndexOf('#')
    if (hashIndex !== -1) {
        searchName = input.substring(0, hashIndex).trim()
        searchCode = input.substring(hashIndex + 1).trim()
    }

    // 숫자만 추출
    searchCode = searchCode.replace(/[^0-9]/g, '')
    if (searchCode.length !== 4) return { found: false, error: '4자리 코드를 입력하세요. (예: 클린체크#0000)', companies: [] }

    const { data, error } = await adminSupabase
        .from('companies')
        .select('id, name, sharing_enabled, code')
        .eq('code', searchCode)

    if (error) {
        console.error('searchCompanyByCode error:', error)
        return { found: false, error: error.message, companies: [] }
    }

    if (!data || data.length === 0) {
        return { found: false, error: '존재하지 않는 업체입니다.', companies: [] }
    }

    // 이름이 입력된 경우 이름도 필터링 (공백 제거 후 비교)
    let filtered = data
    if (searchName) {
        const normalizedInput = searchName.replace(/\s/g, '').toLowerCase()
        filtered = data.filter(c => c.name?.replace(/\s/g, '').toLowerCase() === normalizedInput)
        if (filtered.length === 0) {
            return { found: false, error: `코드 ${searchCode}에 해당하는 "${searchName}" 업체가 없습니다.`, companies: [] }
        }
    }

    // 자사 업체 제외
    filtered = filtered.filter(c => c.id !== companyId)
    if (filtered.length === 0) {
        return { found: false, error: '자사 업체는 등록할 수 없습니다.', companies: [] }
    }

    return { found: true, companies: filtered }
}

/** 파트너 업체 추가 */
export async function addPartner(partnerCompanyId: string): Promise<ActionResponse> {
    const { companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('company_partners')
        .upsert({
            company_id: companyId,
            partner_company_id: partnerCompanyId,
            sharing_active: true
        }, { onConflict: 'company_id,partner_company_id' })

    if (error) {
        console.error('addPartner error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/partners')
    return { success: true }
}

/** 파트너 업체 삭제 */
export async function removePartner(partnerCompanyId: string): Promise<ActionResponse> {
    const { companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('company_partners')
        .delete()
        .eq('company_id', companyId)
        .eq('partner_company_id', partnerCompanyId)

    if (error) {
        console.error('removePartner error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/partners')
    return { success: true }
}

/** 파트너 공유 ON/OFF 토글 */
export async function togglePartnerSharing(partnerCompanyId: string, active: boolean): Promise<ActionResponse> {
    const { companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('company_partners')
        .update({ sharing_active: active })
        .eq('company_id', companyId)
        .eq('partner_company_id', partnerCompanyId)

    if (error) {
        console.error('togglePartnerSharing error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/partners')
    return { success: true }
}

/** 내 파트너 목록 조회 (companies 정보 포함) */
export async function getMyPartners() {
    const { companyId } = await getAuthCompany()
    if (!companyId) return []

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
        .from('company_partners')
        .select('id, sharing_active, partner_company_id, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getMyPartners error:', error)
        return []
    }
    if (!data || data.length === 0) return []

    // 파트너 회사 정보 조회
    const partnerIds = data.map(p => p.partner_company_id)
    const { data: companies } = await adminSupabase
        .from('companies')
        .select('id, name, code')
        .in('id', partnerIds)

    // 합치기
    return data.map(p => {
        const company = companies?.find(c => c.id === p.partner_company_id)
        return {
            id: p.id,
            partner_company_id: p.partner_company_id,
            sharing_active: p.sharing_active,
            name: company?.name || '알 수 없음',
            code: company?.code || '????'
        }
    })
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
    collection_type?: 'site' | 'company'
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
            collection_type: data.collection_type || null,
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

/** 수신 오더 목록 (나를 파트너로 등록한 업체의 open 오더) */
export async function getIncomingOrders() {
    const { companyId } = await getAuthCompany()
    if (!companyId) return []

    const adminSupabase = createAdminClient()

    // 나를 파트너로 등록하고 sharing_active인 업체 ID 가져오기
    const { data: activePartners } = await adminSupabase
        .from('company_partners')
        .select('company_id')
        .eq('partner_company_id', companyId)
        .eq('sharing_active', true)

    if (!activePartners || activePartners.length === 0) return []

    const senderIds = activePartners.map(p => p.company_id)

    // 해당 업체들의 open 오더 조회
    const { data, error } = await adminSupabase
        .from('shared_orders')
        .select('*, sender_company:company_id(name, code)')
        .eq('status', 'open')
        .in('company_id', senderIds)
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

/** 오더 삭제 (발신자 또는 수신자) */
export async function deleteSharedOrder(orderId: string): Promise<ActionResponse> {
    const { companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    const adminSupabase = createAdminClient()

    // 오더 정보 조회
    const { data: order } = await adminSupabase
        .from('shared_orders')
        .select('company_id, accepted_by, status')
        .eq('id', orderId)
        .single()

    if (!order) {
        return { success: false, error: '오더를 찾을 수 없습니다.' }
    }

    // 발신자(자기 오더)인지, 수신자(파트너로 등록된 업체)인지 확인
    const isSender = order.company_id === companyId

    if (!isSender) {
        // 수신자인지 확인 (나를 파트너로 등록한 업체의 오더인지)
        const { data: partnerCheck } = await adminSupabase
            .from('company_partners')
            .select('id')
            .eq('company_id', order.company_id)
            .eq('partner_company_id', companyId)
            .eq('sharing_active', true)
            .maybeSingle()

        if (!partnerCheck) {
            return { success: false, error: '삭제 권한이 없습니다.' }
        }
    }

    if (isSender) {
        // 발신자는 완전 삭제
        const { error } = await adminSupabase
            .from('shared_orders')
            .delete()
            .eq('id', orderId)

        if (error) {
            return { success: false, error: error.message }
        }
    } else {
        // 수신자가 삭제 → 상태 변경 + 발신 업체에 알림
        const { error } = await adminSupabase
            .from('shared_orders')
            .update({ status: 'deleted_by_receiver', accepted_by: companyId })
            .eq('id', orderId)

        if (error) {
            return { success: false, error: error.message }
        }

        // 수신 업체명 조회
        const { data: myCompany } = await adminSupabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .single()
        const companyName = myCompany?.name || '수신 업체'

        // 발신 업체에 푸시 알림
        await sendPushToAdmins(order.company_id, {
            title: '공유 오더 삭제됨',
            body: `${companyName}에서 공유 오더를 삭제하였습니다.`,
            url: '/admin/shared-orders',
            tag: `order-deleted-${orderId}`
        })

        // 알림 기록 저장
        await adminSupabase.from('shared_order_notifications').insert({
            order_id: orderId,
            company_id: order.company_id,
            message: `${companyName}에서 공유 오더를 삭제하였습니다.`
        })
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
                collection_type: order.collection_type || 'company'
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
