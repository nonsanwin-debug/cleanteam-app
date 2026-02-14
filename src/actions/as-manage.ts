'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse, ASRequest } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export async function getASRequests() {
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
        .from('as_requests')
        .select(`
            *,
            site:sites!site_id (name, company_id),
            worker:users!worker_id (name, display_color)
        `)
        .eq('site.company_id', profile.company_id)
        .order('occurred_at', { ascending: false })

    if (error) {
        console.error('Error fetching AS requests:', error)
        return []
    }

    return data as ASRequest[]
}

// AS 단건 조회 (상세 페이지용)
export async function getASRequestById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('as_requests')
        .select(`
            *,
            site:sites!site_id (name, address, customer_name, customer_phone),
            worker:users!worker_id (name, display_color)
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching AS request by id:', error)
        return null
    }

    return data
}

export async function createASRequest(formData: {
    site_id?: string | null
    site_name: string
    worker_id?: string | null
    description: string
    processing_details?: string
    occurred_at: string
    status: 'pending' | 'resolved' | 'monitoring'
    penalty_amount?: number
    photos?: string[]
}) {
    const supabase = await createClient()

    // Use RPC for atomic transaction: balance check + deduction + AS insert
    const { data, error } = await supabase.rpc('create_as_with_penalty_v1', {
        p_site_id: formData.site_id || null,
        p_site_name: formData.site_name,
        p_worker_id: formData.worker_id || null,
        p_description: formData.description,
        p_occurred_at: formData.occurred_at,
        p_status: formData.status,
        p_penalty_amount: formData.penalty_amount || 0
    })

    if (error) {
        console.error('Error creating AS request via RPC:', error)
        return { success: false, error: error.message }
    }

    if (data && !data.success) {
        return { success: false, error: data.error || '등록 실패' }
    }

    // 차감 금액이 있으면 wallet_logs에 penalty 기록 추가 (팀장 활동 내역에 표시)
    const penaltyAmount = formData.penalty_amount || 0
    if (penaltyAmount > 0 && formData.worker_id) {
        // 차감 후 잔액 조회
        const { data: worker } = await supabase
            .from('users')
            .select('current_money, company_id')
            .eq('id', formData.worker_id)
            .single()

        const { error: logError } = await supabase
            .from('wallet_logs')
            .insert({
                user_id: formData.worker_id,
                company_id: worker?.company_id,
                type: 'penalty',
                amount: -penaltyAmount,
                balance_after: worker?.current_money || 0,
                description: `AS 차감: ${formData.site_name} - ${formData.description.substring(0, 30)}`,
                reference_id: data?.id || null
            })

        if (logError) {
            console.error('AS penalty wallet log insert error:', logError)
        }
    }

    // 사진 URL이 있으면 as_requests에 업데이트
    if (formData.photos && formData.photos.length > 0 && data?.id) {
        const { error: photoError } = await supabase
            .from('as_requests')
            .update({ photos: formData.photos })
            .eq('id', data.id)

        if (photoError) {
            console.error('AS photos update error:', photoError)
        }
    }

    // 담당 팀장에게 AS 접수 푸시 알림 발송
    if (formData.worker_id) {
        try {
            const { sendPushToUser } = await import('@/actions/push')
            await sendPushToUser(formData.worker_id, {
                title: '⚠️ AS 접수',
                body: `${formData.site_name}: ${formData.description.substring(0, 50)}`,
                url: '/worker/home',
                tag: 'as-registered',
            })
        } catch (e) {
            console.error('Push notification error:', e)
        }
    }

    revalidatePath('/admin/as-manage')
    return { success: true }
}

export async function updateASRequest(id: string, formData: {
    description: string
    processing_details?: string
    status: 'pending' | 'resolved' | 'monitoring'
    resolved_at?: string
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('as_requests')
        .update({
            description: formData.description,
            processing_details: formData.processing_details || null,
            status: formData.status,
            resolved_at: formData.resolved_at || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating AS request:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/as-manage')
    return { success: true }
}

export async function getASStats() {
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) return []

    const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', adminUser.id)
        .single()

    if (!profile?.company_id) return []

    const companyId = profile.company_id

    // Needs to get: Worker Name | Total Completed Sites | AS Count | AS Rate
    // 1. Get all workers in this company
    const { data: workers } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'worker')
        .eq('company_id', companyId)

    if (!workers) return []

    // 2. Get completed sites count per worker in this company
    const { data: sites } = await supabase
        .from('sites')
        .select('worker_id')
        .eq('status', 'completed')
        .eq('company_id', companyId)

    // 3. Get all AS requests for this company
    const { data: asRequests } = await supabase
        .from('as_requests')
        .select('worker_id, site!inner(company_id)')
        .eq('site.company_id', companyId)

    const stats = workers.map(worker => {
        const completedCount = sites?.filter(s => s.worker_id === worker.id).length || 0
        const asCount = asRequests?.filter(a => a.worker_id === worker.id).length || 0
        const rate = completedCount > 0 ? ((asCount / completedCount) * 100).toFixed(1) : '0'

        return {
            id: worker.id,
            name: worker.name,
            completedCount,
            asCount,
            rate
        }
    })

    // Sort by AS Count desc
    return stats.sort((a, b) => b.asCount - a.asCount)
}

export async function deleteASRequest(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('as_requests')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/as-manage')
    return { success: true }
}

// 팀장용: 내 AS 내역 조회
export async function getMyASRequests() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('as_requests')
        .select(`
            *,
            site:sites!site_id (name)
        `)
        .eq('worker_id', user.id)
        .neq('status', 'resolved')
        .order('occurred_at', { ascending: false })

    if (error) {
        console.error('Error fetching my AS requests:', error)
        return []
    }

    return data as ASRequest[]
}

// AS 사진 업로드
export async function uploadASPhoto(formData: FormData): Promise<ActionResponse<{ publicUrl: string }>> {
    try {
        const supabase = await createClient()
        const file = formData.get('file') as File

        if (!file) return { success: false, error: '파일이 없습니다.' }

        const fileName = `as-photos/${uuidv4()}-${file.name}`

        const { error: uploadError } = await supabase
            .storage
            .from('site-photos')
            .upload(fileName, file)

        if (uploadError) return { success: false, error: uploadError.message }

        const { data: { publicUrl } } = supabase
            .storage
            .from('site-photos')
            .getPublicUrl(fileName)

        return { success: true, data: { publicUrl } }
    } catch (error) {
        console.error('AS photo upload error:', error)
        return { success: false, error: 'AS 사진 업로드 실패' }
    }
}
