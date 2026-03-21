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
    work_date?: string | null
    area_size?: string | null
    collection_type?: 'site' | 'company'
    notes?: string
    address?: string
    customer_phone?: string
    customer_name?: string
    image_urls?: string[]
    is_auto_assign?: boolean
    structure_type?: string
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
            work_date: data.work_date || null,
            area_size: data.area_size || '',
            collection_type: data.collection_type || null,
            notes: data.notes || '',
            address: data.address || '',
            customer_phone: data.customer_phone || '',
            customer_name: data.customer_name || '',
            status: 'open',
            is_auto_assign: data.is_auto_assign || false,
            structure_type: data.structure_type || null,
            parsed_details: data.image_urls && data.image_urls.length > 0 ? { image_urls: data.image_urls } : null
        })

    if (error) {
        console.error('createSharedOrder error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/shared-orders')
    return { success: true }
}

/** 오더 수정 */
export async function updateSharedOrder(orderId: string, data: CreateOrderData): Promise<ActionResponse> {
    const { supabase, user, companyId } = await getAuthCompany()
    if (!companyId || !user) return { success: false, error: '인증 실패' }

    // 기존 오더 정보 확인
    const { data: order } = await supabase
        .from('shared_orders')
        .select('company_id, status')
        .eq('id', orderId)
        .single()

    if (!order) return { success: false, error: '오더를 찾을 수 없습니다.' }
    if (order.company_id !== companyId) return { success: false, error: '수정 권한이 없습니다.' }

    // 수정 권한: open이거나 deleted_by_receiver인 경우 가능
    if (order.status !== 'open' && order.status !== 'deleted_by_receiver') {
        return { success: false, error: '이 오더는 현재 상태에서 수정할 수 없습니다.' }
    }

    const updateData: any = {
        region: data.region,
        work_date: data.work_date || null,
        area_size: data.area_size || '',
        collection_type: data.collection_type || null,
        notes: data.notes || '',
        address: data.address || '',
        customer_phone: data.customer_phone || '',
        customer_name: data.customer_name || '',
    }

    // 만약 수신자가 삭제했던 오더라면, 다시 open 상태로 되돌리고 accepted_by 초기화
    if (order.status === 'deleted_by_receiver') {
        updateData.status = 'open'
        updateData.accepted_by = null
    }

    const { error } = await supabase
        .from('shared_orders')
        .update(updateData)
        .eq('id', orderId)

    if (error) {
        console.error('updateSharedOrder error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/shared-orders')
    return { success: true }
}

/** 내가 등록한 오더 목록 */
export async function getMySharedOrders() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const adminSupabase = createAdminClient()

    const { data: orders, error } = await supabase
        .from('shared_orders')
        .select('*, accepted_company:accepted_by(name, code), transferred_site:transferred_site_id(status, payment_status)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getMySharedOrders error:', error)
        return []
    }
    if (!orders || orders.length === 0) return []

    // 오픈 상태인 오더들에 대한 지원자 목록 조회
    const openOrderIds = orders.filter((o: any) => o.status === 'open').map((o: any) => o.id)
    let applicantsGrouped: Record<string, any[]> = {}

    if (openOrderIds.length > 0) {
        const { data: applicants } = await adminSupabase
            .from('shared_order_applicants')
            .select('order_id, status, updated_at, company:company_id(id, name)')
            .in('order_id', openOrderIds)

        if (applicants) {
            applicants.forEach(app => {
                if (!applicantsGrouped[app.order_id]) {
                    applicantsGrouped[app.order_id] = []
                }
                const companyData = Array.isArray(app.company) ? app.company[0] : app.company
                applicantsGrouped[app.order_id].push({
                    ...companyData,
                    status: app.status,
                    updated_at: app.updated_at
                })
            })
        }
    }

    return orders.map((order: any) => ({
        ...order,
        applicants: applicantsGrouped[order.id] || []
    }))
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

    const senderIds = activePartners?.map(p => p.company_id) || []

    // 파트너(부동산 중개인) 권한을 가진 유저들의 소속 업체 ID 모두 가져오기 (오픈 마켓용 글로벌 노출)
    const { data: partnerUsers } = await adminSupabase
        .from('users')
        .select('company_id')
        .eq('role', 'partner')

    const realEstateCompIds = partnerUsers?.map(u => u.company_id).filter(Boolean) || []

    // 프라이빗 공유 파트너 + 글로벌 부동산 채널 통합
    const allSenderIds = Array.from(new Set([...senderIds, ...realEstateCompIds]))

    // 내가 삭제(숨김) 처리한 오더 목록 가져오기
    const { data: hiddenOrders } = await adminSupabase
        .from('hidden_shared_orders')
        .select('order_id')
        .eq('company_id', companyId)

    const hiddenOrderIds = hiddenOrders?.map(h => h.order_id) || []

    // 해당 업체들의 open 오더 조회
    if (allSenderIds.length === 0) return []

    let query = adminSupabase
        .from('shared_orders')
        .select('*, sender_company:company_id(name, code)')
        .eq('status', 'open')
        .in('company_id', allSenderIds)
        .order('created_at', { ascending: false })

    // 숨긴 오더가 있으면 제외
    if (hiddenOrderIds.length > 0) {
        query = query.not('id', 'in', `(${hiddenOrderIds.join(',')})`)
    }

    const { data: orders, error } = await query

    if (error) {
        console.error('getIncomingOrders error:', error)
        return []
    }
    if (!orders || orders.length === 0) return []

    // 내가 지원한(상세정보 요청한) 오더인지 확인
    const orderIds = orders.map((o: any) => o.id)
    const { data: myApplications } = await adminSupabase
        .from('shared_order_applicants')
        .select('order_id')
        .eq('company_id', companyId)
        .in('order_id', orderIds)

    const appliedOrderIds = new Set(myApplications?.map((a: any) => a.order_id) || [])

    return orders.map((order: any) => ({
        ...order,
        is_applied: appliedOrderIds.has(order.id)
    }))
}

/** 오더 수락 (상세정보 요청/지원) */
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
        return { success: false, error: '오더를 찾을 수 없거나 마감되었습니다.' }
    }

    // 2. 지원 기록 추가 (shared_order_applicants)
    const { error: insertError } = await supabase
        .from('shared_order_applicants')
        .insert({
            order_id: orderId,
            company_id: companyId
        })

    if (insertError) {
        if (insertError.code === '23505') {
            return { success: false, error: '이미 수락(요청)한 오더입니다.' }
        }
        console.error('acceptOrder error:', insertError)
        return { success: false, error: insertError.message }
    }

    // 3. 업체명 조회
    const { data: myCompany } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()
    const companyName = myCompany?.name || '업체'

    // 4. AI 자동 배정 옵션이 켜져있다면, 첫 번째 요청자(현재 요청자)에게 즉시 배정 확정
    if (order.is_auto_assign) {
        const newStatus = 'transferred'

        const { error: updateError } = await supabase
            .from('shared_orders')
            .update({
                accepted_by: companyId,
                accepted_at: new Date().toISOString(),
                status: newStatus
            })
            .eq('id', orderId)

        if (!updateError) {
            // 무조건 현장 관리(Sites)로 자동 이관
            const parsedDetails = order.parsed_details || {}
            const orderToTransfer = {
                ...order,
                ...parsedDetails,
                site_name: parsedDetails.name,
                accepted_by: companyId,
                status: newStatus
            }
            // @ts-ignore
            if (typeof transferToSite === 'function') await transferToSite(orderToTransfer, companyId, supabase)

            // 발신 업체(중개인)에게 알림 발송 - 자동 매칭 성공
            await sendPushToAdmins(order.company_id, {
                title: '오더 자동 배정 완료 🤖',
                body: `넥서스 AI 시스템이 [${companyName}] 업체로 오더를 배정했습니다.`,
                url: '/field/orders',
                tag: `order-auto-assigned-${orderId}`
            })

            await supabase.from('shared_order_notifications').insert({
                order_id: orderId,
                company_id: order.company_id,
                message: `넥서스 AI가 [${companyName}] 업체로 오더 배정을 확정했습니다.`
            })

            revalidatePath('/admin/shared-orders')
            return { success: true }
        } else {
            console.error('Auto Assign Error:', updateError)
        }
    }

    // 발신 업체에 알림 (일반적인 배정 요청)
    await sendPushToAdmins(order.company_id, {
        title: '오더 배정 요청',
        body: `${companyName}에서 오더 배정을 요청하였습니다.`,
        url: '/field/orders',
        tag: `order-applied-${orderId}`
    })

    // 알림 기록 저장
    await supabase.from('shared_order_notifications').insert({
        order_id: orderId,
        company_id: order.company_id,
        message: `${companyName}에서 오더 배정을 요청하였습니다.`
    })

    revalidatePath('/admin/shared-orders')
    return { success: true }
}

/** 지원 업체 중 하나를 최종 확정 */
export async function confirmOrderAssignee(orderId: string, assigneeCompanyId: string): Promise<ActionResponse> {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { success: false, error: '인증 실패' }

    // 1. 내 오더인지 확인
    const { data: order, error: fetchError } = await supabase
        .from('shared_orders')
        .select('*')
        .eq('id', orderId)
        .eq('company_id', companyId)
        .eq('status', 'open')
        .single()

    if (fetchError || !order) {
        return { success: false, error: '오더를 찾을 수 없거나 이미 마감되었습니다.' }
    }

    // 2. 수락 처리 (강제로 무조건 이관)
    const newStatus = 'transferred'

    const { error: updateError } = await supabase
        .from('shared_orders')
        .update({
            accepted_by: assigneeCompanyId,
            accepted_at: new Date().toISOString(),
            status: newStatus
        })
        .eq('id', orderId)

    if (updateError) {
        console.error('confirmOrderAssignee error:', updateError)
        return { success: false, error: updateError.message }
    }

    // 3. 업체 관리에 상세정보 무조건 이관 (전화번호나 주소가 미흡해도 현장 카드는 생성함)
    const parsedDetails = order.parsed_details || {}
    const orderToTransfer = {
        ...order,
        ...parsedDetails,
        site_name: parsedDetails.name,
        accepted_by: assigneeCompanyId,
        status: newStatus
    }
    await transferToSite(orderToTransfer, assigneeCompanyId, supabase)

    const { data: myCompany } = await supabase.from('companies').select('name').eq('id', companyId).single()
    await sendPushToAdmins(assigneeCompanyId, {
        title: '공유 오더 확정',
        body: `${myCompany?.name || '업체'}에서 귀하의 오더 요청을 확정하였습니다. 바로 현장 관리로 이관되었습니다.`,
        url: '/admin/sites',
        tag: `order-confirmed-${orderId}`
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

/** AI 오더 분석 결과를 이용한 오더 상세정보 업데이트 */
export async function updateOrderDetailsWithAI(
    orderId: string,
    parsedData: any
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

    // 2. shared_orders의 기본 정보 업데이트 (address, phone 등 기존 호환성 유지)
    const { error: updateError } = await supabase
        .from('shared_orders')
        .update({
            address: parsedData.address,
            customer_phone: parsedData.customer_phone,
            customer_name: parsedData.customer_name || null,
            work_date: parsedData.cleaning_date || order.work_date,
            area_size: parsedData.area_size || order.area_size,
            notes: parsedData.special_notes || order.notes,
            parsed_details: parsedData // AI 파싱 원본 데이터 저장 (재이관 시 데이터 유실 방지)
        })
        .eq('id', orderId)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    // 3. 수락 상태이면 자동 이관
    if (order.status === 'accepted' && order.accepted_by) {
        // AI 파싱된 모든 데이터를 transferToSite에 전달하기 위해 합침
        const updatedOrder = {
            ...order,
            ...parsedData,
            site_name: parsedData.name // AI parser returns 'name' for the site name
        }
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
        .select('company_id, accepted_by, status, transferred_site_id')
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
        // 이미 매칭되어 이관된 현장이 존재한다면, 파트너가 취소(삭제)할 시 해당 현장도 일괄 삭제
        if (order.transferred_site_id) {
            await adminSupabase.from('sites').delete().eq('id', order.transferred_site_id)
            
            // 수지가 배정된 업체에게 오더 취소 알림 통보
            if (order.accepted_by) {
                try {
                    const { sendPushToAdmins } = await import('@/actions/push')
                    await sendPushToAdmins(order.accepted_by, {
                        title: '파트너 오더 취소 안내',
                        body: `부동산/파트너 측에서 오더 접수를 취소하여 현장 목록에서 자동 제거되었습니다.`,
                        url: '/admin/sites',
                        tag: `site-cancelled-${order.transferred_site_id}`
                    })
                } catch (pushErr) {
                    console.error('Failed to notify company about cancelled order:', pushErr)
                }
            }
        }

        // 발신자는 완전 삭제
        const { error } = await adminSupabase
            .from('shared_orders')
            .delete()
            .eq('id', orderId)

        if (error) {
            return { success: false, error: error.message }
        }
    } else {
        // 수신자가 삭제 → 해당 업체에게만 보이지 않게 숨기기 처리
        const { error } = await adminSupabase
            .from('hidden_shared_orders')
            .upsert({ company_id: companyId, order_id: orderId }, { onConflict: 'company_id, order_id' })

        if (error) {
            return { success: false, error: error.message }
        }
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
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const adminSupabase = createAdminClient()

        // 발신 업체명 조회
        const { data: senderCompany } = await supabase
            .from('companies')
            .select('name')
            .eq('id', order.company_id)
            .single()

        const { data: site, error } = await adminSupabase
            .from('sites')
            .insert({
                company_id: receivingCompanyId,
                name: order.address || order.site_name || order.customer_name || `${order.region} 현장`,
                address: order.address,
                customer_name: order.customer_name || null,
                customer_phone: order.customer_phone || null,
                cleaning_date: order.cleaning_date || order.work_date || null,
                start_time: order.start_time || null,
                residential_type: order.residential_type || null,
                structure_type: order.structure_type || null,
                area_size: order.area_size || null,
                balance_amount: order.balance_amount || 0,
                special_notes: order.special_notes || order.notes
                    ? `[오더 공유: ${senderCompany?.name || '타업체'}] ${order.special_notes || order.notes}`
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
            await adminSupabase
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
