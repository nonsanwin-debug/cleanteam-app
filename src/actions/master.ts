'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Action Responses
export type ActionResponse = {
    success: boolean
    error?: string
}

export async function verifyMasterAccess() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
        
    return profile?.role === 'master'
}

/* ============================
    Companies Management
============================ */

export async function getMasterCompanies() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    // 1. Fetch companies with their users' roles, excluding deleted ones
    const { data: companies, error } = await adminClient
        .from('companies')
        .select('*, users(role)')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching companies:', error)
        return []
    }

    // Filter out partner-only companies (if ANY user has role 'partner', it's a partner company)
    const cleaningCompanies = (companies || []).filter(c => {
        if (c.users && c.users.length > 0) {
            const isPartnerCompany = c.users.some((u: any) => u.role === 'partner');
            return !isPartnerCompany;
        }
        return true;
    });

    return cleaningCompanies
}

export async function updateCompanyStatus(companyId: string, status: 'approved' | 'rejected' | 'deleted'): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .update({ status })
            .eq('id', companyId)

        if (error) {
            console.error('Error updating company status:', error)
            return { success: false, error: '상태 업데이트에 실패했습니다.' }
        }

        // When a company is approved, automatically activate its pending admin/users
        if (status === 'approved') {
            await adminClient
                .from('users')
                .update({ status: 'active' })
                .eq('company_id', companyId)
                .eq('status', 'pending');
        } else if (status === 'rejected') {
            // If rejected, maybe set them to deleted so they don't clog up the pending list forever
            // or leave them pending so they can be re-approved. Setting to deleted is safer for cleanup.
            await adminClient
                .from('users')
                .update({ status: 'deleted' })
                .eq('company_id', companyId)
                .eq('status', 'pending');
        }

        revalidatePath('/master/companies')
        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}

export async function manageCompanyPoints(companyId: string, amount: number, actionType: 'add' | 'deduct', currency: 'points' | 'cash' | 'booking_points' = 'points', descriptionOverride?: string): Promise<ActionResponse> {
    try {
        if (amount <= 0) {
            return { success: false, error: '올바른 금액을 입력하세요.' }
        }

        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()
        
        // 1. Get current company point/cash
        const { data: company, error: fetchError } = await adminClient
            .from('companies')
            .select('points, cash, booking_points, name')
            .eq('id', companyId)
            .single()
            
        if (fetchError || !company) {
            return { success: false, error: '업체 정보를 찾을 수 없습니다.' }
        }

        let newBalance = currency === 'points' ? (company.points || 0) : (currency === 'cash' ? (company.cash || 0) : (company.booking_points || 0))
        if (actionType === 'add') {
            newBalance += amount
        } else {
            newBalance -= amount
            if (newBalance < 0) {
                const currencyName = currency === 'points' ? '포인트' : (currency === 'booking_points' ? '예약 포인트' : '캐쉬')
                return { success: false, error: `업체의 잔여 ${currencyName}보다 크게 차감할 수 없습니다.` }
            }
        }

        // 2. Update company points/cash/booking_points
        let updatePayload = {}
        if (currency === 'points') updatePayload = { points: newBalance }
        else if (currency === 'cash') updatePayload = { cash: newBalance }
        else updatePayload = { booking_points: newBalance }
        
        const { error: updateError } = await adminClient
            .from('companies')
            .update(updatePayload)
            .eq('id', companyId)

        if (updateError) {
            console.error('Error updating company balance:', updateError)
            return { success: false, error: '잔액 처리에 실패했습니다.' }
        }

        // 3. Log (master_logs or wallet_logs)
        const logTypeName = currency === 'points' ? '포인트' : (currency === 'booking_points' ? '예약 포인트' : '캐쉬')
        const finalDescription = descriptionOverride || `마스터 관리자 ${logTypeName} ${actionType === 'add' ? '충전(지급)' : '차감(환수)'}`
        const { error: logError } = await adminClient
            .from('wallet_logs')
            .insert({
                company_id: companyId,
                type: actionType === 'add' ? 'manual_add' : 'manual_deduct',
                amount: amount,
                balance_after: newBalance,
                description: finalDescription
            })

        if (logError) {
            console.warn('Could not log master point change:', logError)
        }

        revalidatePath('/master/companies')
        return { success: true }
    } catch (error) {
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}

/* ============================
    Users Management
============================ */

export async function getMasterUsers() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    const { data: users, error } = await adminClient
        .from('users')
        .select(`
            id, name, phone, email, role, status, created_at, account_info, current_money, 
            companies(name, code, status)
        `)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching users for master:', error)
        return []
    }

    return users || []
}

export async function getMasterPartners() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    const { data: partners, error } = await adminClient
        .from('users')
        .select(`
            id, name, phone, email, role, status, created_at, account_info, current_money, 
            companies(id, name, code, status, points, booking_points, benefits)
        `)
        .eq('role', 'partner')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching partners for master:', error)
        return []
    }

    return partners || []
}

export async function deleteUserForce(userId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 1. Soft delete on `users` table
        const { error: profileError } = await adminClient
            .from('users')
            .update({ status: 'deleted' })
            .eq('id', userId)

        if (profileError) {
            console.error('Profile soft delete update error:', profileError)
            return { success: false, error: '프로필 상태 업데이트 중 오류가 발생했습니다.' }
        }

        // 2. Scramble auth state to completely block login
        // NOT scrambling password so they can log back in easily upon restore IF we just change their metadata.
        // Or we just update their auth role to 'banned'.
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { status: 'deleted', role: 'banned' }
        })

        if (authError) {
            console.error('Auth user update error:', authError)
            return { success: false, error: '인증 정보 비활성화 중 오류가 발생했습니다.' }
        }

        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('deleteUserForce error:', error)
        return { success: false, error: '강제 탈퇴 중 오류가 발생했습니다.' }
    }
}


/* ============================
    Recovery Management
============================ */

export async function getDeletedCompanies() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    const { data: companies, error } = await adminClient
        .from('companies')
        .select('*')
        .eq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching deleted companies:', error)
        return []
    }

    return companies || []
}

export async function getDeletedUsers() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()

    const { data: users, error } = await adminClient
        .from('users')
        .select(`
            id, name, phone, email, role, status, created_at, account_info, current_money, 
            companies(name, code, status)
        `)
        .eq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching deleted users:', error)
        return []
    }

    return users || []
}

export async function restoreCompany(companyId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .update({ status: 'approved' }) // Restore back to approved (or active depending on your logic)
            .eq('id', companyId)

        if (error) {
            console.error('Error restoring company error:', error)
            return { success: false, error: '업체 복구 중 오류가 발생했습니다.' }
        }

        // Also restore associated deleted users
        await adminClient
            .from('users')
            .update({ status: 'active' })
            .eq('company_id', companyId)
            .eq('status', 'deleted');

        revalidatePath('/master/companies')
        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('restoreCompany error:', error)
        return { success: false, error: '복구 중 오류가 발생했습니다.' }
    }
}

export async function restoreUser(userId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 1. Restore `users` table state
        const { data: userProfile, error: profileError } = await adminClient
            .from('users')
            .update({ status: 'active' }) // Back to active
            .eq('id', userId)
            .select('role')
            .single()

        if (profileError) {
            console.error('User restore profile update error:', profileError)
            return { success: false, error: '회원 프로필 복구 중 오류가 발생했습니다.' }
        }

        // 2. Restore auth user metadata
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { status: 'active', role: userProfile?.role || 'worker' }
        })

        if (authError) {
            console.error('Auth user restore error:', authError)
            return { success: false, error: '회원 인증 정보 복구 중 오류가 발생했습니다.' }
        }

        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('restoreUser error:', error)
        return { success: false, error: '복구 중 오류가 발생했습니다.' }
    }
}

export async function hardDeleteCompany(companyId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .delete()
            .eq('id', companyId)

        if (error) {
            console.error('Error hard deleting company:', error)
            if (error.code === '23503') {
                return { success: false, error: '이 업체에 연결된 작업 혹은 결제 내역이 있어 완전히 삭제할 수 없습니다.' }
            }
            return { success: false, error: '업체 영구 삭제 중 오류가 발생했습니다.' }
        }

        revalidatePath('/master/companies')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('hardDeleteCompany error:', error)
        return { success: false, error: '영구 삭제 중 오류가 발생했습니다.' }
    }
}

export async function hardDeleteUser(userId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 1. Delete from auth.users (This cascads to public.users usually)
        const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
        
        if (authError) {
            console.error('Auth user hard delete error:', authError)
            return { success: false, error: '인증 정보 영구 삭제 중 오류가 발생했습니다.' }
        }

        // 2. Just to be safe, delete from public.users as well in case cascade is off
        const { error: profileError } = await adminClient
            .from('users')
            .delete()
            .eq('id', userId)

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('User profile hard delete error:', profileError)
            if (profileError.code === '23503') {
                return { success: false, error: '이 회원과 연결된 작업 내역이 있어 프로필을 완전히 지울 수 없습니다.' }
            }
        }

        revalidatePath('/master/users')
        revalidatePath('/master/recovery')
        return { success: true }
    } catch (error) {
        console.error('hardDeleteUser error:', error)
        return { success: false, error: '영구 삭제 중 오류가 발생했습니다.' }
    }
}

export async function getAllSharedOrders() {
    const { verifyMasterAccess } = await import('./master')
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
        .from('shared_orders')
        .select('*, company:company_id(name, code)')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getAllSharedOrders error:', error)
        return []
    }

    if (!data || data.length === 0) return []

    // accepted_by 업체명 수동 조회 (FK 조인 불가 시 대비)
    const acceptedIds = [...new Set(data.filter((o: any) => o.accepted_by).map((o: any) => o.accepted_by))]
    let acceptedMap: Record<string, string> = {}
    if (acceptedIds.length > 0) {
        const { data: acceptedCompanies } = await adminSupabase
            .from('companies')
            .select('id, name')
            .in('id', acceptedIds)
        if (acceptedCompanies) {
            acceptedCompanies.forEach((c: any) => { acceptedMap[c.id] = c.name })
        }
    }

    return data.map((order: any) => ({
        ...order,
        accepted_company: order.accepted_by ? { name: acceptedMap[order.accepted_by] || null } : null
    }))
}

export async function deleteSharedOrderForce(orderId: string) {
    const { verifyMasterAccess } = await import('./master')
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return { success: false, error: '권한이 없습니다.' }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()

    // 오더 정보 조회
    const { data: order } = await adminSupabase
        .from('shared_orders')
        .select('transferred_site_id, parsed_details')
        .eq('id', orderId)
        .single()

    const deletedByLabel = '마스터 관리자 (마스터)'

    // 이관된 현장이 있으면 soft delete
    if (order?.transferred_site_id) {
        await adminSupabase
            .from('sites')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by_name: deletedByLabel,
                deleted_by_role: 'master',
            })
            .eq('id', order.transferred_site_id)
    }

    // 오더 soft delete
    const { error } = await adminSupabase
        .from('shared_orders')
        .update({
            status: 'deleted',
            parsed_details: {
                ...(order?.parsed_details || {}),
                deleted_by: deletedByLabel,
                deleted_at: new Date().toISOString(),
            }
        })
        .eq('id', orderId)

    if (error) {
        console.error('deleteSharedOrderForce error:', error)
        return { success: false, error: '오더 삭제 중 오류가 발생했습니다.' }
    }

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/master/orders')
    revalidatePath('/master/deleted-orders')
    revalidatePath('/admin/shared-orders')
    revalidatePath('/admin/sites')

    return { success: true }
}

export async function updateCompanyRegionAndBadges(
    companyId: string, 
    data: { 
        region_province?: string | null, 
        region_city?: string | null, 
        is_national?: boolean, 
        badge_business?: boolean, 
        badge_excellent?: boolean, 
        badge_aftercare?: boolean, 
        expose_partner_orders?: boolean 
    }
): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('companies')
            .update(data)
            .eq('id', companyId)

        if (error) {
            console.error('Error updating company regions and badges:', error)
            return { success: false, error: '업데이트에 실패했습니다.' }
        }

        const { revalidatePath } = await import('next/cache')
        revalidatePath('/master/companies')
        revalidatePath('/master/partners')
        return { success: true }
    } catch (error) {
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}

/**
 * 마스터 — 고객 링크 오더를 공유 오더 게시판으로 전환
 * parsed_details.pending_master = false 로 설정
 */
export async function releaseToSharedBoard(orderId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 현재 parsed_details를 가져와서 pending_master 플래그 제거
        const { data: order } = await adminClient
            .from('shared_orders')
            .select('parsed_details')
            .eq('id', orderId)
            .single()

        const updatedDetails = { ...(order?.parsed_details || {}), pending_master: false }

        const { error } = await adminClient
            .from('shared_orders')
            .update({ parsed_details: updatedDetails })
            .eq('id', orderId)

        if (error) {
            console.error('releaseToSharedBoard error:', error)
            return { success: false, error: '상태 변경 실패' }
        }

        revalidatePath('/master/orders')
        revalidatePath('/admin/shared-orders')
        return { success: true }
    } catch (err) {
        return { success: false, error: '서버 오류' }
    }
}

/**
 * 마스터 — 고객 링크 오더를 특정 업체에 직접 배정
 * status → transferred, accepted_by 설정, 현장(site) 생성
 */
export async function assignCustomerOrder(orderId: string, companyId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 1. 오더 정보 조회
        const { data: order, error: fetchError } = await adminClient
            .from('shared_orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (fetchError || !order) {
            return { success: false, error: '오더를 찾을 수 없습니다.' }
        }

        // 2. parsed_details에서 pending_master 플래그 제거
        const updatedDetails = { ...(order.parsed_details || {}), pending_master: false }

        // 3. 오더 상태 업데이트
        const { error } = await adminClient
            .from('shared_orders')
            .update({ 
                status: 'transferred',
                accepted_by: companyId,
                accepted_at: new Date().toISOString(),
                parsed_details: updatedDetails
            })
            .eq('id', orderId)

        if (error) {
            console.error('assignCustomerOrder error:', error)
            return { success: false, error: '배정 실패' }
        }

        // 4. 발신 업체명 조회
        const { data: senderCompany } = await adminClient
            .from('companies')
            .select('name')
            .eq('id', order.company_id)
            .single()

        // 5. 기존에 이관된 현장이 있으면 삭제 (회수 후 재배정 시)
        if (order.transferred_site_id) {
            const oldSiteId = order.transferred_site_id
            // FK 참조 먼저 해제
            await adminClient.from('shared_orders').update({ transferred_site_id: null }).eq('id', orderId)
            // 연관 레코드 삭제
            await adminClient.from('photos').delete().eq('site_id', oldSiteId)
            await adminClient.from('checklist_submissions').delete().eq('site_id', oldSiteId)
            await adminClient.from('site_members').delete().eq('site_id', oldSiteId)
            // 사이트 삭제
            await adminClient.from('sites').delete().eq('id', oldSiteId)
        }

        // 6. 캐쉬 차감 (스마트 배정과 동일 로직)
        const parsedDetails = order.parsed_details || {}
        const orderPrice = parsedDetails.estimated_price || (() => {
            // region에서 가격 추출 (extractOrderPrice 로직)
            if (order.region) {
                const manwonMatch = order.region.match(/([\d.]+)만원/)
                if (manwonMatch?.[1]) return Math.floor(parseFloat(manwonMatch[1]) * 10000)
                const wonMatch = order.region.match(/([\d,]+)원/)
                if (wonMatch?.[1]) return parseInt(wonMatch[1].replace(/,/g, ''), 10)
            }
            return order.total_price || 0
        })()

        const isDiscount = parsedDetails.reward_type === 'discount'
        const requiredCash = isDiscount ? Math.floor(orderPrice * 0.1) : Math.floor(orderPrice * 0.2)

        if (requiredCash > 0) {
            const { data: targetCompany } = await adminClient
                .from('companies')
                .select('cash')
                .eq('id', companyId)
                .single()

            const currentCash = targetCompany?.cash || 0

            if (currentCash < requiredCash) {
                return { success: false, error: `배정 업체의 캐쉬 잔액이 부족합니다.\n필요: ${requiredCash.toLocaleString()} C\n잔액: ${currentCash.toLocaleString()} C` }
            }

            await adminClient.from('companies')
                .update({ cash: currentCash - requiredCash })
                .eq('id', companyId)

            await adminClient.from('wallet_logs').insert({
                company_id: companyId,
                type: 'system_deduct',
                amount: requiredCash,
                balance_after: currentCash - requiredCash,
                description: `[마스터배정수수료 ${isDiscount ? '10%' : '20%'}] 고객링크 오더 배정 캐쉬 차감`
            })
        }

        // 7. 현장(site) 생성 — worker 없이, status: scheduled (대기중)
        const detailAddr = parsedDetails.detail_address || ''
        const baseAddress = order.address || ''
        const estimatedPrice = parsedDetails.estimated_price || 0

        const { data: site } = await adminClient
            .from('sites')
            .insert({
                company_id: companyId,
                name: detailAddr || order.customer_name || `${order.region} 현장`,
                address: baseAddress,
                customer_name: order.customer_name || null,
                customer_phone: order.customer_phone || null,
                cleaning_date: order.work_date || null,
                residential_type: parsedDetails.residential_type || parsedDetails.structure_type || null,
                structure_type: parsedDetails.structure_type || null,
                area_size: order.area_size || null,
                balance_amount: estimatedPrice,
                special_notes: `[마스터 배정: ${senderCompany?.name || '고객링크'}] ${order.notes || ''}`.trim(),
                status: 'scheduled',
                payment_status: 'none',
                collection_type: 'company'
            })
            .select('id')
            .single()

        // 8. shared_orders에 이관된 site_id 기록
        if (site) {
            await adminClient
                .from('shared_orders')
                .update({ transferred_site_id: site.id })
                .eq('id', orderId)
        }

        revalidatePath('/master/orders')
        revalidatePath('/admin/shared-orders')
        revalidatePath('/admin/sites')
        return { success: true }
    } catch (err) {
        return { success: false, error: '서버 오류' }
    }
}

/**
 * 마스터 — 배정된 오더를 회수 (잘못 배정 시)
 * transferred → open (pending_master: true), 생성된 현장 삭제
 */
export async function revokeCustomerOrder(orderId: string): Promise<ActionResponse> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 1. 오더 정보 조회
        const { data: order, error: fetchError } = await adminClient
            .from('shared_orders')
            .select('*, parsed_details')
            .eq('id', orderId)
            .single()

        if (fetchError || !order) {
            return { success: false, error: '오더를 찾을 수 없습니다.' }
        }

        if (order.status === 'completed') {
            return { success: false, error: '작업이 완료된 오더는 회수할 수 없습니다.' }
        }

        // 이관된 현장이 완료 상태인지 확인
        if (order.transferred_site_id) {
            const { data: site } = await adminClient
                .from('sites')
                .select('status')
                .eq('id', order.transferred_site_id)
                .single()
            if (site?.status === 'completed') {
                return { success: false, error: '현장 작업이 완료된 오더는 회수할 수 없습니다.' }
            }
        }

        // 2. 이관된 현장(site)이 있으면 삭제
        if (order.transferred_site_id) {
            const oldSiteId = order.transferred_site_id
            // FK 참조 먼저 해제
            await adminClient.from('shared_orders').update({ transferred_site_id: null }).eq('id', orderId)
            // 연관 레코드 삭제
            await adminClient.from('photos').delete().eq('site_id', oldSiteId)
            await adminClient.from('checklist_submissions').delete().eq('site_id', oldSiteId)
            await adminClient.from('site_members').delete().eq('site_id', oldSiteId)
            // 사이트 삭제
            await adminClient.from('sites').delete().eq('id', oldSiteId)
        }

        // 3. 오더 상태를 다시 pending_master로 복원
        const updatedDetails = { ...(order.parsed_details || {}), pending_master: true }

        const { error } = await adminClient
            .from('shared_orders')
            .update({
                status: 'open',
                accepted_by: null,
                accepted_at: null,
                transferred_site_id: null,
                parsed_details: updatedDetails
            })
            .eq('id', orderId)

        if (error) {
            console.error('revokeCustomerOrder error:', error)
            return { success: false, error: '회수 실패' }
        }

        revalidatePath('/master/orders')
        revalidatePath('/admin/shared-orders')
        revalidatePath('/admin/sites')
        return { success: true }
    } catch (err) {
        return { success: false, error: '서버 오류' }
    }
}

// 삭제된 오더/현장 조회 (마스터용)
export async function getDeletedSites() {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return { deletedSites: [], deletedOrders: [] }

    const adminClient = createAdminClient()

    // 1. soft-deleted sites
    const { data: sites } = await adminClient
        .from('sites')
        .select(`
            *,
            company:companies!company_id (name)
        `)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })

    // 2. deleted shared_orders (사이트 없는 오더 포함)
    const { data: orders } = await adminClient
        .from('shared_orders')
        .select(`
            *,
            sender_company:company_id (name),
            accepted_company:accepted_by (name)
        `)
        .eq('status', 'deleted')
        .order('created_at', { ascending: false })

    return {
        deletedSites: sites || [],
        deletedOrders: orders || []
    }
}

// 삭제된 현장 복원 (마스터용)
export async function restoreDeletedSite(siteId: string) {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return { success: false, error: '권한이 없습니다.' }

    const adminClient = createAdminClient()

    const { error } = await adminClient
        .from('sites')
        .update({
            is_deleted: false,
            deleted_at: null,
            deleted_by_name: null,
            deleted_by_role: null,
        })
        .eq('id', siteId)

    if (error) {
        console.error('restoreDeletedSite error:', error)
        return { success: false, error: '복원 실패' }
    }

    // 연결된 shared_order도 복원
    const { data: linkedOrders } = await adminClient
        .from('shared_orders')
        .select('id')
        .eq('transferred_site_id', siteId)
        .eq('status', 'deleted')

    if (linkedOrders && linkedOrders.length > 0) {
        for (const order of linkedOrders) {
            await adminClient
                .from('shared_orders')
                .update({ status: 'transferred' })
                .eq('id', order.id)
        }
    }

    revalidatePath('/master/deleted-orders')
    revalidatePath('/admin/sites')
    return { success: true }
}

// 수수료 환불 (마스터용)
export async function refundCommission(orderId: string, companyId: string, amount: number, rateLabel: string) {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return { success: false, error: '권한이 없습니다.' }

    if (amount <= 0) return { success: false, error: '환불 금액이 없습니다.' }

    const adminClient = createAdminClient()

    // 업체 현재 캐쉬 조회
    const { data: company } = await adminClient
        .from('companies')
        .select('cash, name')
        .eq('id', companyId)
        .single()

    if (!company) return { success: false, error: '업체를 찾을 수 없습니다.' }

    const newCash = (company.cash || 0) + amount

    // 캐쉬 지급
    await adminClient.from('companies')
        .update({ cash: newCash })
        .eq('id', companyId)

    // 로그 기록
    await adminClient.from('wallet_logs').insert({
        company_id: companyId,
        type: 'system_add',
        amount: amount,
        balance_after: newCash,
        description: `[수수료환불 ${rateLabel}] 삭제 오더 수수료 환불 (마스터 승인)`
    })

    // 오더에 환불 기록
    const { data: order } = await adminClient
        .from('shared_orders')
        .select('parsed_details')
        .eq('id', orderId)
        .single()

    if (order) {
        await adminClient
            .from('shared_orders')
            .update({
                parsed_details: {
                    ...(order.parsed_details || {}),
                    refunded: true,
                    refunded_amount: amount,
                    refunded_rate: rateLabel,
                    refunded_at: new Date().toISOString(),
                }
            })
            .eq('id', orderId)
    }

    revalidatePath('/master/deleted-orders')
    return { success: true }
}

// 업체 피드 별명 사용 토글
export async function toggleCompanyAlias(companyId: string, useAlias: boolean): Promise<ActionResponse> {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return { success: false, error: '권한이 없습니다.' }

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('companies')
        .update({ use_alias_name: useAlias })
        .eq('id', companyId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/master/companies')
    return { success: true }
}

// 피드 별명 목록 조회
export async function getFeedAliasNames(): Promise<string[]> {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return []

    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('platform_settings')
        .select('feed_alias_names')
        .limit(1)
        .single()

    return data?.feed_alias_names || []
}

// 피드 별명 추가
export async function addFeedAliasName(name: string): Promise<ActionResponse> {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return { success: false, error: '권한이 없습니다.' }

    if (!name.trim()) return { success: false, error: '업체명을 입력하세요.' }

    const adminClient = createAdminClient()

    const { data } = await adminClient
        .from('platform_settings')
        .select('feed_alias_names')
        .limit(1)
        .single()

    const current = data?.feed_alias_names || []
    if (current.includes(name.trim())) return { success: false, error: '이미 등록된 업체명입니다.' }

    const { error } = await adminClient
        .from('platform_settings')
        .update({ feed_alias_names: [...current, name.trim()] })
        .not('id', 'is', null)

    if (error) return { success: false, error: error.message }

    revalidatePath('/master/settings')
    return { success: true }
}

// 피드 별명 삭제
export async function removeFeedAliasName(name: string): Promise<ActionResponse> {
    const isMaster = await verifyMasterAccess()
    if (!isMaster) return { success: false, error: '권한이 없습니다.' }

    const adminClient = createAdminClient()

    const { data } = await adminClient
        .from('platform_settings')
        .select('feed_alias_names')
        .limit(1)
        .single()

    const current = data?.feed_alias_names || []
    const updated = current.filter((n: string) => n !== name)

    const { error } = await adminClient
        .from('platform_settings')
        .update({ feed_alias_names: updated })
        .not('id', 'is', null)

    if (error) return { success: false, error: error.message }

    revalidatePath('/master/settings')
    return { success: true }
}
