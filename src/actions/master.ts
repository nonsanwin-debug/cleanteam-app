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

    // 1. Delete associated applicants
    await adminSupabase.from('shared_order_applicants').delete().eq('order_id', orderId)
    // 2. Delete notifications
    await adminSupabase.from('shared_order_notifications').delete().eq('order_id', orderId)
    // 3. Delete from hidden tables
    await adminSupabase.from('hidden_shared_orders').delete().eq('order_id', orderId)
    
    // 4. Finally delete the order
    const { error } = await adminSupabase
        .from('shared_orders')
        .delete()
        .eq('id', orderId)

    if (error) {
        console.error('deleteSharedOrderForce error:', error)
        return { success: false, error: '오더 삭제 중 오류가 발생했습니다.' }
    }

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/master/orders')
    revalidatePath('/admin/shared-orders')

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

        // 5. 현장(site) 생성 — worker 없이, status: scheduled (대기중)
        const parsedDetails = order.parsed_details || {}
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

        // 6. shared_orders에 이관된 site_id 기록
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

