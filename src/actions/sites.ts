'use server'

import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return []

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return []

    const { data, error } = await supabase
        .from('sites')
        .select(`
      *,
      worker:users!worker_id (name)
    `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching sites:', error)
        return []
    }

    return data as Site[]
}

export async function getWorkers() {
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Get current user's company_id
    const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

    if (!userData?.company_id) {
        // If admin has no company, maybe return all or none? 
        // For safety, return all (if super admin) or empty?
        // Let's assume return all for now if no company assigned, or return empty.
        // Better: Return only those with NO company? Or all?
        // Let's Log it.
        console.log('User has no company_id, fetching all workers')
        const { data, error } = await supabase
            .from('users')
            .select('id, name')
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
        .select('id, name, current_money')
        .eq('role', 'worker')
        .eq('company_id', userData.company_id)
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

        // 중복 체크: 동일 업체, 동일 날짜, 동일 현장명
        const { data: existingSite } = await supabase
            .from('sites')
            .select('id')
            .eq('company_id', userData.company_id)
            .eq('cleaning_date', formData.cleaning_date || '')
            .eq('name', formData.name)
            .maybeSingle()

        if (existingSite) {
            return {
                success: false,
                error: '기존 현장이 있습니다 삭제 후 현장배정 요망'
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
    const supabase = await createClient()

    // 1. Get current user's company_id for isolation
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return []

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', authUser.id)
        .single()

    if (!profile?.company_id) return []

    const companyId = profile.company_id

    // 2. Fetch recent photos with joins
    const { data: photos, error } = await supabase
        .from('photos')
        .select(`
            id,
            type,
            created_at,
            site:sites!inner(name, company_id),
            user:users(name)
        `)
        .eq('site.company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('getRecentActivities error:', error)
        return []
    }

    // 3. Map to dashboard activity format
    return (photos || []).map(photo => {
        const siteData = (photo as any).site
        const userData = (photo as any).user

        return {
            id: `photo-${photo.id}`,
            type: 'photo_uploaded' as 'photo_uploaded' | 'work_started' | 'work_completed',
            actor: userData?.name || '현장팀장',
            target: siteData?.name || '알 수 없음',
            timestamp: photo.created_at
        }
    })
}

export async function getSiteById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('sites')
        .select(`
      *,
      worker:users!worker_id (name)
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
            } as any)
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
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return { todayScheduled: 0, inProgress: 0, completed: 0, activeWorkers: 0, totalWorkers: 0 }

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return { todayScheduled: 0, inProgress: 0, completed: 0, activeWorkers: 0, totalWorkers: 0 }

    const companyId = profile.company_id

    // Get Today in KST (Asia/Seoul)
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

    // 1. Site Info
    const { data: site } = await supabase
        .from('sites')
        .select(`
            *,
            worker:users!worker_id (name, phone)
        `)
        .eq('id', id)
        .single()

    if (!site) return null

    // 2. Photos
    const { data: photos } = await supabase
        .from('photos')
        .select('*')
        .eq('site_id', id)
        .order('created_at')

    // 3. Checklist Submission
    const { data: checklist } = await supabase
        .from('checklist_submissions')
        .select('*')
        .eq('site_id', id)
        .single() // Assuming one submission per site for now

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
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return []

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return []

    // Fetch sites that are either in_progress OR (completed AND cleaning_date = today)
    // We want to see everything happening today.
    // However, for "Real-time" section, mostly 'in_progress' is key, and recently 'completed'.

    // Fetch recent activity regardless of date to avoid timezone issues
    const { data, error } = await supabase
        .from('sites')
        .select(`
            *,
            worker:users!worker_id (name)
        `)
        .eq('company_id', profile.company_id)
        .or('status.eq.in_progress,status.eq.completed')
        .order('started_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error fetching activity sites:', error)
        return []
    }

    return data as (Site & { started_at?: string, completed_at?: string, updated_at?: string })[]
}


