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
}

export type CreateSiteDTO = {
    name: string
    address: string
    worker_id?: string
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
}

export async function getSites() {
    noStore()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('sites')
        .select(`
      *,
      worker:users!worker_id (name)
    `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching sites:', error)
        return []
    }

    return data as Site[]
}

export async function getWorkers() {
    const supabase = await createClient()

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
                    special_notes: formData.special_notes || null
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
                special_notes: formData.special_notes
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


export async function getDashboardStats() {
    const supabase = await createClient()

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
            .eq('status', 'scheduled')
            .eq('cleaning_date', today),
        // 2. 진행 중
        supabase
            .from('sites')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'in_progress'),
        // 3. 완료
        supabase
            .from('sites')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed'),
        // 4. 활동 중인 팀장
        supabase
            .from('sites')
            .select('worker_id')
            .eq('status', 'in_progress')
            .not('worker_id', 'is', null),
        // 5. 전체 팀장 수
        supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
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

export async function getTodayActivitySites() {
    const supabase = await createClient()

    // Get Today in KST (Asia/Seoul)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })

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
        .or('status.eq.in_progress,status.eq.completed')
        .order('started_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error fetching activity sites:', error)
        return []
    }

    return data as (Site & { started_at?: string, completed_at?: string, updated_at?: string })[]
}


export async function getRecentActivities() {
    const supabase = await createClient()

    // 1. Sites Activity (Start/Complete) - Fetch recent ones
    // We rely on started_at and completed_at since updated_at might be missing
    const { data: sites } = await supabase
        .from('sites')
        .select(`
            id, name, status, started_at, completed_at,
            worker:users!worker_id (name)
        `)
        .or('status.eq.in_progress,status.eq.completed')
        .limit(10)

    // 3. Photos Activity (Upload) - Fetch more than 10 to group them
    const { data: photos } = await supabase
        .from('photos')
        .select(`
            id, created_at, site_id, type,
            site:sites!site_id (
                id,
                name,
                worker_id,
                worker:users!worker_id (name)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(30) // Fetch more to allow grouping

    const photoActivities: any[] = []

    if (photos && photos.length > 0) {
        // Group photos by site_id, worker_id, type, and time window (e.g., 1 minute)
        const groupedPhotos: {
            [key: string]: {
                firstPhoto: any,
                count: number,
                latestTimestamp: string
            }
        } = {}

        photos.forEach(photo => {
            const siteId = photo.site_id
            const type = photo.type
            const workerId = (photo.site as any)?.worker_id
            // Create a time bucket key (e.g. to minute precision) or just check difference manually
            // Interactive grouping: iterate and checking compatible previous group?
            // Simpler approach: Time bucket.
            const time = new Date(photo.created_at)
            // Round down to nearest 5 minutes to group "recent" uploads together
            // Or simpler: just key by YYYY-MM-DD-HH-MM
            const timeKey = `${time.getFullYear()}-${time.getMonth()}-${time.getDate()}-${time.getHours()}-${time.getMinutes()}`

            const groupKey = `${siteId}-${workerId}-${type}-${timeKey}`

            if (!groupedPhotos[groupKey]) {
                groupedPhotos[groupKey] = {
                    firstPhoto: photo,
                    count: 1,
                    latestTimestamp: photo.created_at
                }
            } else {
                groupedPhotos[groupKey].count++
                // Keep the latest timestamp of the group
                if (new Date(photo.created_at) > new Date(groupedPhotos[groupKey].latestTimestamp)) {
                    groupedPhotos[groupKey].latestTimestamp = photo.created_at
                }
            }
        })

        // Check if we need to merge groups that are close in time (optional, but 1-min bucket is decent)

        Object.values(groupedPhotos).forEach(group => {
            const photo = group.firstPhoto
            const siteData = photo.site as any
            const workerName = siteData?.worker?.name

            photoActivities.push({
                id: `photo-group-${photo.id}`, // Use one ID
                type: 'photo_uploaded',
                actor: workerName || '알 수 없음',
                target: siteData?.name || '알 수 없음',
                timestamp: group.latestTimestamp,
                detail: group.count > 1 ? `${photo.type} 사진 ${group.count}장` : photo.type, // "before 사진 3장" or just "before"
                count: group.count
            })
        })
    }

    // Mix and Sort
    const activities = [
        ...(sites?.map(site => {
            const workerName = (site.worker as any)?.name
            if (site.status === 'in_progress' && site.started_at) {
                return {
                    id: `start-${site.id}`,
                    type: 'work_started',
                    actor: workerName || '알 수 없음',
                    target: site.name,
                    timestamp: site.started_at
                }
            } else if (site.status === 'completed' && site.completed_at) {
                return {
                    id: `complete-${site.id}`,
                    type: 'work_completed',
                    actor: workerName || '알 수 없음',
                    target: site.name,
                    timestamp: site.completed_at
                }
            }
            return null
        }).filter(Boolean) || []),
        ...photoActivities
    ] as {
        id: string
        type: 'work_started' | 'work_completed' | 'photo_uploaded'
        actor: string
        target: string
        timestamp: string
        detail?: string
        count?: number
    }[]

    // Sort by timestamp descending
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
}
