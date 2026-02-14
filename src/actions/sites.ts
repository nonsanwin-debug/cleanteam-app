'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthCompany } from '@/lib/supabase/auth-context'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

export type Site = {
    id: string
    name: string
    address: string
    status: 'scheduled' | 'in_progress' | 'completed'
    worker_id: string | null
    created_at: string
    updated_at?: string
    // New Fields
    customer_name?: string
    customer_phone?: string
    residential_type?: string
    area_size?: string
    structure_type?: string
    cleaning_date?: string
    start_time?: string
    special_notes?: string // 특이사항
    worker_name?: string // Denormalized for public access
    worker_phone?: string // New field for call button
    worker?: {
        name: string | null
        display_color?: string | null
    } | null
    // Claim Fields
    claimed_amount?: number
    payment_status?: 'requested' | 'paid' | 'rejected'
    claim_details?: any[]
    claim_photos?: string[]
    // New Settlement Fields
    balance_amount?: number
    additional_amount?: number
    additional_description?: string
    collection_type?: 'site' | 'company'
}

export type CreateSiteDTO = {
    name: string
    address: string
    worker_id?: string | null
    status?: 'scheduled' | 'in_progress' | 'completed'
    // New Fields
    customer_name?: string
    customer_phone?: string
    residential_type?: string
    area_size?: string
    structure_type?: string
    cleaning_date?: string
    start_time?: string
    special_notes?: string
    balance_amount?: number
    additional_amount?: number
    additional_description?: string
    collection_type?: 'site' | 'company'
}

export async function getSites() {
    noStore()
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data, error } = await supabase
        .from('sites')
        .select(`
      *,
      worker:users!worker_id (name, display_color)
    `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching sites:', error)
        return []
    }

    return data as Site[]
}

export async function getWorkers() {
    noStore()
    const { supabase, user, companyId } = await getAuthCompany()
    if (!user) return []

    if (!companyId) {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, display_color, worker_type')
            .eq('role', 'worker')
            .order('name')

        if (error) {
            console.error('Error fetching workers:', error)
            return []
        }
        return data
    }

    const { data, error } = await supabase
        .from('users')
        .select('id, name, current_money, display_color, worker_type')
        .eq('role', 'worker')
        .eq('company_id', companyId)
        .order('name')

    if (error) {
        console.error('Error fetching workers:', error)
        return []
    }

    return data
}

export async function createSite(formData: CreateSiteDTO) {
    const supabase = await createClient()

    // Wrap in try-catch to prevent 500 errors on the client
    try {
        // Get current user and their company_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            throw new Error('인증된 사용자가 아닙니다.')
        }

        const { data: userData } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (!userData?.company_id) {
            throw new Error('소속 업체를 찾을 수 없습니다.')
        }

        // 중복 체크: 동일 업체, 동일 날짜, 동일 현장명, 동일 주소
        if (formData.cleaning_date && formData.name) {
            const { data: existingSite } = await supabase
                .from('sites')
                .select('id')
                .eq('company_id', userData.company_id)
                .eq('cleaning_date', formData.cleaning_date)
                .eq('name', formData.name)
                .eq('address', formData.address)
                .maybeSingle()

            if (existingSite) {
                return {
                    success: false,
                    error: '기존 현장이 있습니다 삭제 후 현장배정 요망'
                }
            }
        }

        // Fetch worker name/phone if worker_id is present
        let workerName = null
        let workerPhone = null
        if (formData.worker_id) {
            const { data: worker } = await supabase.from('users').select('name, phone').eq('id', formData.worker_id).single()
            if (worker) {
                workerName = worker.name
                workerPhone = worker.phone
            }
        }

        const { error } = await supabase
            .from('sites')
            .insert([
                {
                    name: formData.name,
                    address: formData.address,
                    worker_id: formData.worker_id || null,
                    worker_name: workerName,
                    worker_phone: workerPhone,
                    status: formData.status || 'scheduled',
                    company_id: userData?.company_id, // Add company_id for RLS
                    // New Fields
                    customer_name: formData.customer_name,
                    customer_phone: formData.customer_phone,
                    residential_type: formData.residential_type,
                    area_size: formData.area_size,
                    structure_type: formData.structure_type,
                    cleaning_date: formData.cleaning_date || null,
                    start_time: formData.start_time || null,
                    special_notes: formData.special_notes || null,
                    balance_amount: formData.balance_amount || 0,
                    additional_amount: formData.additional_amount || 0,
                    additional_description: formData.additional_description || null,
                    collection_type: formData.collection_type || 'company'
                }
            ])

        if (error) {
            console.error('Error creating site:', error)
            return { success: false, error: error.message }
        }

        // 팀장에게 푸시 알림 발송
        if (formData.worker_id) {
            try {
                const { sendPushToUser } = await import('@/actions/push')
                await sendPushToUser(formData.worker_id, {
                    title: '🏠 새 현장 배정',
                    body: `${formData.name} (${formData.cleaning_date || '날짜 미정'})`,
                    url: '/worker/home',
                    tag: 'site-assigned',
                })
            } catch (e) {
                console.error('Push notification error:', e)
            }
        }

        revalidatePath('/admin/sites')
        return { success: true }
    } catch (e: any) {
        console.error('Unexpected error in createSite:', e)
        return { success: false, error: e.message || '알 수 없는 서버 오류가 발생했습니다.' }
    }
}

export async function deleteSite(id: string) {
    const supabase = await createClient()

    try {
        const { error, count } = await supabase
            .from('sites')
            .delete({ count: 'exact' })
            .eq('id', id)

        if (error) {
            console.error('Error deleting site:', error)
            return { success: false, error: error.message }
        }

        if (count === 0) {
            return { success: false, error: '삭제할 현장을 찾을 수 없거나 삭제 권한이 없습니다.' }
        }

        revalidatePath('/admin/sites')
        return { success: true }
    } catch (e: any) {
        console.error('Unexpected error in deleteSite:', e)
        return { success: false, error: e.message || '삭제 중 오류가 발생했습니다.' }
    }
}

export async function getRecentActivities() {
    noStore()
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: photos, error } = await supabase
        .from('photos')
        .select(`
            id,
            type,
            created_at,
            site_id,
            user_id,
            site:sites!inner(name, company_id),
            user:users(name)
        `)
        .eq('site.company_id', companyId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)

    if (error) {
        console.error('getRecentActivities error:', error)
        return []
    }

    // Group photos by site + user + date
    const groupMap = new Map<string, {
        siteId: string
        userId: string
        siteName: string
        userName: string
        count: number
        latestTimestamp: string
    }>()

    for (const photo of (photos || [])) {
        const p = photo as any
        const photoDate = (p.created_at as string).substring(0, 10)
        const key = `${p.site_id}_${p.user_id}_${photoDate}`

        const siteName = Array.isArray(p.site) ? p.site[0]?.name : p.site?.name
        const userName = Array.isArray(p.user) ? p.user[0]?.name : p.user?.name

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                siteId: p.site_id,
                userId: p.user_id,
                siteName: siteName || '알 수 없음',
                userName: userName || '현장팀장',
                count: 1,
                latestTimestamp: p.created_at
            })
        } else {
            groupMap.get(key)!.count++
        }
    }

    // 4. Convert to activity format
    return Array.from(groupMap.values())
        .sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime())
        .slice(0, 15)
        .map(group => ({
            id: `photo-group-${group.siteId}-${group.userId}-${group.latestTimestamp.substring(0, 10)}`,
            type: 'photo_uploaded' as 'photo_uploaded' | 'work_started' | 'work_completed',
            actor: group.userName,
            target: group.siteName,
            siteId: group.siteId,
            timestamp: group.latestTimestamp,
            count: group.count
        }))
}

export async function getSiteById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('sites')
        .select(`
      *,
      worker:users!worker_id (name, display_color)
    `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching site:', error)
        return null
    }

    return data as Site
}

export async function updateSite(id: string, formData: CreateSiteDTO) {
    const supabase = await createClient()

    try {
        // Fetch worker name/phone if worker_id is present
        let workerName = null
        let workerPhone = null
        if (formData.worker_id) {
            const { data: worker } = await supabase.from('users').select('name, phone').eq('id', formData.worker_id).single()
            if (worker) {
                workerName = worker.name
                workerPhone = worker.phone
            }
        }

        const { error } = await supabase
            .from('sites')
            .update({
                name: formData.name,
                address: formData.address,
                worker_id: formData.worker_id || null,
                worker_name: workerName,
                worker_phone: workerPhone,
                status: formData.status || 'scheduled',
                customer_name: formData.customer_name,
                customer_phone: formData.customer_phone,
                residential_type: formData.residential_type,
                area_size: formData.area_size,
                structure_type: formData.structure_type,
                cleaning_date: formData.cleaning_date,
                start_time: formData.start_time,
                special_notes: formData.special_notes,
                balance_amount: formData.balance_amount,
                additional_amount: formData.additional_amount,
                additional_description: formData.additional_description,
                collection_type: formData.collection_type
            })
            .eq('id', id)

        if (error) {
            throw new Error(error.message)
        }

        // 배정된 팀장에게 현장 수정 알림 발송
        if (formData.worker_id) {
            try {
                const { sendPushToUser } = await import('@/actions/push')
                await sendPushToUser(formData.worker_id, {
                    title: '📝 현장 정보 수정',
                    body: `${formData.name} 현장 정보가 수정되었습니다.`,
                    url: '/worker/home',
                    tag: 'site-updated',
                })
            } catch (e) {
                console.error('Push notification error:', e)
            }
        }

        revalidatePath('/admin/sites')
        return { success: true }
    } catch (e: any) {
        console.error('Unexpected error in updateSite:', e)
        // Ensure we explicitly return success: false instead of throwing if possible,
        // but the caller might expect a throw. 
        // Based on the caller code in site-dialog.tsx line 165: 
        // await updateSite(...) 
        // It catches errors. So returning success:false is DIFFERENT behavior from throwing.
        // However, throwing guarantees the caller's catch block works.
        // BUT current task is to avoid 500s. Throwing in Server Action causes 500 if not handled by Next.js.
        // Wait, standard server action behavior is to return 500 on throw.
        // I will return { success: false, error: e.message } and update caller to handle it?
        // Let's stick to throwing for updateSite for now as the caller logic wasn't fully refactored to check result.success for updates.
        // Actually, site-dialog call:
        // await updateSite(siteId, data)
        // toast.success(...)
        // It expects void/success. If it returns object, it assumes success unless it throws.
        // I should THROW from here to trigger the catch block in the client.
        // BUT wrapping in try-catch and re-throwing creates the same 500 error if Next.js doesn't serialize the error.
        // So for updateSite, I will simply rethrow simplified error to avoid leaking sensitive info.
        throw new Error(e.message || '수정 중 오류가 발생했습니다.')
    }
}

export async function forceCompleteSite(id: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('sites')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error

        revalidatePath(`/admin/sites/${id}`)
        revalidatePath('/admin/sites')
        return { success: true }
    } catch (e: any) {
        console.error('Error force completing site:', e)
        return { success: false, error: e.message || '작업 완료 처리 중 오류가 발생했습니다.' }
    }
}


export async function getDashboardStats() {
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return { todayScheduled: 0, inProgress: 0, completed: 0, activeWorkers: 0, totalWorkers: 0 }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })

    // Execute all queries in parallel
    const [
        { count: todayScheduled },
        { count: inProgress },
        { count: completed },
        { data: activeWorkersData },
        { count: totalWorkers }
    ] = await Promise.all([
        // 1. 오늘 예정 현장
        supabase
            .from('sites')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'scheduled')
            .eq('cleaning_date', today),
        // 2. 진행 중
        supabase
            .from('sites')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'in_progress'),
        // 3. 완료
        supabase
            .from('sites')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'completed'),
        // 4. 활동 중인 팀장
        supabase
            .from('sites')
            .select('worker_id')
            .eq('company_id', companyId)
            .eq('status', 'in_progress')
            .not('worker_id', 'is', null),
        // 5. 전체 팀장 수
        supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('role', 'worker')
    ])

    // Count unique workers
    const activeWorkersCount = new Set(activeWorkersData?.map(s => s.worker_id)).size

    return {
        todayScheduled: todayScheduled || 0,
        inProgress: inProgress || 0,
        completed: completed || 0,
        activeWorkers: activeWorkersCount || 0,
        totalWorkers: totalWorkers || 0
    }
}
export async function getSiteAdminDetails(id: string) {
    const supabase = await createClient()

    // Parallelize: site info, photos, and checklist
    const siteQuery = supabase
        .from('sites')
        .select(`
            *,
            worker:users!worker_id (name, phone, display_color)
        `)
        .eq('id', id)
        .single()

    const photosQuery = supabase
        .from('photos')
        .select('id, site_id, url, type, created_at')
        .eq('site_id', id)
        .order('created_at')

    const checklistQuery = supabase
        .from('checklist_submissions')
        .select('*')
        .eq('site_id', id)
        .single()

    const [{ data: site }, { data: photos }, { data: checklist }] = await Promise.all([
        siteQuery,
        photosQuery,
        checklistQuery
    ])

    if (!site) return null

    return {
        site,
        photos: photos || [],
        checklist: checklist || null
    }
}

export async function updateSettlementInfo(
    siteId: string,
    data: {
        collection_type: 'site' | 'company'
        balance_amount: number
        additional_amount: number
        additional_description: string
    }
) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('sites')
            .update({
                collection_type: data.collection_type,
                balance_amount: data.balance_amount,
                additional_amount: data.additional_amount,
                additional_description: data.additional_description,
            })
            .eq('id', siteId)

        if (error) {
            return { success: false, error: error.message }
        }

        revalidatePath(`/admin/sites/${siteId}`)
        revalidatePath('/admin/sites')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message || '정산 정보 수정 중 오류가 발생했습니다.' }
    }
}

export async function getTodayActivitySites() {
    noStore()
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    // Fetch sites that are either in_progress OR (completed AND cleaning_date = today)
    // We want to see everything happening today.
    // However, for "Real-time" section, mostly 'in_progress' is key, and recently 'completed'.

    // Fetch recent activity regardless of date to avoid timezone issues
    const { data, error } = await supabase
        .from('sites')
        .select(`
            *,
            worker:users!worker_id (name, display_color)
        `)
        .eq('company_id', companyId)
        .or('status.eq.in_progress,status.eq.completed')
        .order('started_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error fetching activity sites:', error)
        return []
    }

    return data as (Site & { started_at?: string, completed_at?: string, updated_at?: string })[]
}


// 현장에 팀원 배정
export async function addSiteMember(siteId: string, userId: string) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: '인증되지 않은 사용자' }

        const { data: userData } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()

        const { error } = await supabase
            .from('site_members')
            .upsert({
                site_id: siteId,
                user_id: userId,
                company_id: userData?.company_id
            }, { onConflict: 'site_id,user_id' })

        if (error) {
            console.error('addSiteMember error:', error)
            return { success: false, error: error.message }
        }

        // 푸시 알림 발송
        try {
            const { sendPushToUser } = await import('@/actions/push')

            // 현장 정보 (이름, 팀장 ID)
            const { data: site } = await supabase
                .from('sites')
                .select('name, worker_id')
                .eq('id', siteId)
                .single()

            // 배정된 팀원 이름
            const { data: member } = await supabase
                .from('users')
                .select('name')
                .eq('id', userId)
                .single()

            const siteName = site?.name || '현장'
            const memberName = member?.name || '팀원'

            // 팀장에게 알림: "OOO 팀원이 OOO 현장에 배정되었습니다"
            if (site?.worker_id) {
                const { data: leader } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', site.worker_id)
                    .single()

                await sendPushToUser(site.worker_id, {
                    title: '팀원 배정 알림',
                    body: `${memberName} 팀원이 ${siteName} 현장에 배정되었습니다`,
                    url: '/worker',
                    tag: 'member-assigned',
                })

                // 팀원에게 알림: "OOO 현장에 배정되었습니다 (팀장: OOO)"
                const leaderName = leader?.name || '팀장'
                await sendPushToUser(userId, {
                    title: '현장 배정 알림',
                    body: `${siteName} 현장에 배정되었습니다 (팀장: ${leaderName})`,
                    url: '/worker',
                    tag: 'site-assigned',
                })
            } else {
                // 팀장 미배정인 경우 팀원에게만 알림
                await sendPushToUser(userId, {
                    title: '현장 배정 알림',
                    body: `${siteName} 현장에 배정되었습니다`,
                    url: '/worker',
                    tag: 'site-assigned',
                })
            }
        } catch (pushError) {
            console.error('Push notification error:', pushError)
            // 푸시 실패해도 배정은 성공 처리
        }

        revalidatePath('/admin/sites')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message || '팀원 배정 실패' }
    }
}

// 현장에서 팀원 제거
export async function removeSiteMember(siteId: string, userId: string) {
    const supabase = await createClient()
    try {
        const { error } = await supabase
            .from('site_members')
            .delete()
            .eq('site_id', siteId)
            .eq('user_id', userId)

        if (error) {
            console.error('removeSiteMember error:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/admin/sites')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message || '팀원 제거 실패' }
    }
}

// 현장별 배정 팀원 조회 (전체)
export async function getAllSiteMembers() {
    noStore()
    const { supabase, companyId } = await getAuthCompany()
    if (!companyId) return []

    const { data, error } = await supabase
        .from('site_members')
        .select('site_id, user_id')
        .eq('company_id', companyId)

    if (error) {
        console.error('getAllSiteMembers error:', error)
        return []
    }

    return data || []
}
