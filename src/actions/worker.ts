'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthCompany } from '@/lib/supabase/auth-context'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

import { ActionResponse, AssignedSite, SitePhoto } from '@/types'


export async function getAssignedSites(): Promise<AssignedSite[]> {
    noStore() // Opt out of static caching
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return []

        // 1. 팀장으로 배정된 현장 (기존)
        const { data: leaderSites, error } = await supabase
            .from('sites')
            .select('id, name, address, status, worker_id, created_at, customer_name, customer_phone, residential_type, area_size, structure_type, cleaning_date, start_time, special_notes, balance_amount, additional_amount, additional_description, collection_type, worker_notes')
            .eq('worker_id', user.id)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching assigned sites:', error)
            return []
        }

        // 2. 팀원으로 배정된 현장 (site_members)
        let memberSites: AssignedSite[] = []
        try {
            const { data: memberData } = await supabase
                .from('site_members')
                .select('site_id')
                .eq('user_id', user.id)

            if (memberData && memberData.length > 0) {
                const siteIds = memberData.map(m => m.site_id)
                const { data: sites } = await supabase
                    .from('sites')
                    .select('id, name, address, status, worker_id, created_at, customer_name, customer_phone, residential_type, area_size, structure_type, cleaning_date, start_time, special_notes, balance_amount, additional_amount, additional_description, collection_type, worker_notes')
                    .in('id', siteIds)
                    .order('created_at', { ascending: true })

                memberSites = (sites || []) as AssignedSite[]
            }
        } catch {
            // site_members 테이블이 없을 수 있음
        }

        // 중복 제거 후 합산
        const allSites = [...(leaderSites || []) as AssignedSite[], ...memberSites]
        let uniqueSites = Array.from(new Map(allSites.map(s => [s.id, s])).values())

        // 워커가 숨긴 현장 필터링
        try {
            const { data: hiddenSites } = await supabase
                .from('worker_hidden_sites')
                .select('site_id')
                .eq('user_id', user.id)

            if (hiddenSites && hiddenSites.length > 0) {
                const hiddenIds = new Set(hiddenSites.map(h => h.site_id))
                uniqueSites = uniqueSites.filter(s => !hiddenIds.has(s.id))
            }
        } catch {
            // worker_hidden_sites 테이블이 없을 수 있음
        }

        // 각 현장의 배정 팀원 정보 가져오기 (separate queries)
        if (uniqueSites.length > 0) {
            try {
                const siteIds = uniqueSites.map(s => s.id)
                const { data: allMembers } = await supabase
                    .from('site_members')
                    .select('site_id, user_id')
                    .in('site_id', siteIds)

                if (allMembers && allMembers.length > 0) {
                    // 유저 이름 일괄 조회
                    const userIds = [...new Set(allMembers.map(m => m.user_id))]
                    const { data: users } = await supabase
                        .from('users')
                        .select('id, name')
                        .in('id', userIds)

                    const userMap = new Map<string, string>()
                    if (users) {
                        for (const u of users) {
                            userMap.set(u.id, u.name || '이름없음')
                        }
                    }

                    const membersBySite = new Map<string, { user_id: string; name: string }[]>()
                    for (const m of allMembers) {
                        const list = membersBySite.get(m.site_id) || []
                        list.push({
                            user_id: m.user_id,
                            name: userMap.get(m.user_id) || '이름없음'
                        })
                        membersBySite.set(m.site_id, list)
                    }
                    for (const site of uniqueSites) {
                        site.members = membersBySite.get(site.id) || []
                    }
                }
            } catch (membersError) {
                console.error('팀원 정보 조회 오류 (무시):', membersError)
            }
        }

        return uniqueSites
    } catch (error) {
        console.error('Unexpected error in getAssignedSites:', error)
        return []
    }
}

export async function startWork(siteId: string, location: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        // Direct update to bypass RPC/DB function issues (updated_at missing column error)
        // We only update fields that definitely exist
        const { error } = await supabase
            .from('sites')
            .update({
                status: 'in_progress',
                started_at: new Date().toISOString()
            })
            .eq('id', siteId)

        if (error) {
            console.error('startWork error:', error)
            return { success: false, error: error.message || '작업 시작 처리에 실패했습니다.' }
        }

        revalidatePath('/worker/home')
        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in startWork:', error)
        return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
    }
}

export async function completeWork(siteId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: '인증되지 않은 사용자입니다.' }

        // 1. Fetch site info
        const { data: site, error: siteError } = await supabase
            .from('sites')
            .select('additional_amount, worker_id, name, company_id')
            .eq('id', siteId)
            .single()

        if (siteError) {
            console.error('completeWork site fetch error:', siteError)
            return { success: false, error: '현장 정보 조회에 실패했습니다.' }
        }



        // 2. Mark as completed
        const { error } = await supabase
            .from('sites')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', siteId)

        if (error) {
            console.error('completeWork error:', error)
            return { success: false, error: error.message || '작업 완료 처리에 실패했습니다.' }
        }

        // 3. Create pending commission claim (admin approval required)
        const additionalAmount = site?.additional_amount || 0
        if (additionalAmount > 0 && site?.worker_id) {
            // Fetch worker's commission_rate
            const { data: worker } = await supabase
                .from('users')
                .select('commission_rate')
                .eq('id', site.worker_id)
                .single()

            const commissionRate = worker?.commission_rate ?? 100
            const commissionAmount = Math.round(additionalAmount * (commissionRate / 100))



            if (commissionAmount > 0) {
                // Set payment_status to 'requested' so it appears in admin approval queue
                const { error: claimError } = await supabase
                    .from('sites')
                    .update({
                        payment_status: 'requested',
                        claimed_amount: commissionAmount,
                        claimed_by: user.id
                    })
                    .eq('id', siteId)

                if (claimError) {
                    console.error('Failed to create commission claim:', claimError)
                }
            }
        }

        // 관리자에게 작업 완료 푸시 알림 발송
        if (site?.company_id) {
            try {
                const { sendPushToAdmins } = await import('@/actions/push')
                const { data: workerInfo } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', user.id)
                    .single()

                await sendPushToAdmins(site.company_id, {
                    title: '✅ 작업 완료',
                    body: `${workerInfo?.name || '팀장'}님이 작업을 완료했습니다: ${site.name}`,
                    url: '/admin/dashboard',
                    tag: 'work-completed',
                })
            } catch (e) {
                console.error('Push notification error:', e)
            }
        }

        revalidatePath('/worker/home')
        revalidatePath(`/worker/sites/${siteId}`)
        revalidatePath('/worker/schedule')
        revalidatePath('/admin/dashboard')
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in completeWork:', error)
        return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
    }
}


export async function uploadPhoto(formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const file = formData.get('file') as File
        const siteId = formData.get('siteId') as string
        const type = formData.get('type') as 'before' | 'during' | 'after' | 'special'

        if (!file || !siteId || !type) {
            return { success: false, error: '필수 항목이 누락되었습니다.' }
        }

        const fileName = `${siteId}/${type}/${uuidv4()}-${file.name}`

        // 1. Upload to Storage
        const fileBuffer = await file.arrayBuffer()
        const { error: uploadError } = await supabase
            .storage
            .from('site-photos')
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: true
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return { success: false, error: uploadError.message }
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('site-photos')
            .getPublicUrl(fileName)

        // 3. Insert into Photos table
        const { data: { user } } = await supabase.auth.getUser()

        const { error: dbError } = await supabase
            .from('photos')
            .insert([
                {
                    site_id: siteId,
                    url: publicUrl,
                    type: type,
                    user_id: user?.id || null // Track who uploaded the photo
                }
            ])

        if (dbError) {
            console.error('Photo DB Insert Error:', dbError)
            return { success: false, error: dbError.message }
        }

        revalidatePath(`/worker/sites/${siteId}`)
        return { success: true, data: { publicUrl } }
    } catch (error) {
        console.error('Unexpected error in uploadPhoto:', error)
        return { success: false, error: error instanceof Error ? error.message : '사진 업로드 중 오류가 발생했습니다.' }
    }
}

// 클라이언트 직접 업로드용: DB에 사진 레코드만 삽입 (Storage 업로드는 클라이언트에서 처리)
export async function insertPhotoRecord(
    siteId: string,
    url: string,
    type: 'before' | 'during' | 'after' | 'special'
): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: '인증되지 않은 사용자입니다.' }
        if (!siteId || !url || !type) {
            return { success: false, error: '필수 항목이 누락되었습니다.' }
        }

        const { error: dbError } = await supabase
            .from('photos')
            .insert([
                {
                    site_id: siteId,
                    url: url,
                    type: type,
                    user_id: user.id
                }
            ])

        if (dbError) {
            console.error('Photo DB Insert Error:', dbError)
            return { success: false, error: dbError.message }
        }

        revalidatePath(`/worker/sites/${siteId}`)
        return { success: true, data: { publicUrl: url } }
    } catch (error) {
        console.error('Unexpected error in insertPhotoRecord:', error)
        return { success: false, error: error instanceof Error ? error.message : '사진 레코드 저장 중 오류가 발생했습니다.' }
    }
}

export async function getSiteDetails(id: string): Promise<ActionResponse<AssignedSite>> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('sites')
            .select('id, name, address, status, worker_id, created_at, customer_name, customer_phone, residential_type, area_size, structure_type, cleaning_date, start_time, special_notes, balance_amount, additional_amount, additional_description, collection_type, worker_notes')
            .eq('id', id)
            .single()

        if (error) return { success: false, error: error.message };
        return { success: true, data: data as AssignedSite };
    } catch (error) {
        console.error('getSiteDetails error:', error)
        return { success: false, error: '현장 정보를 불러오는 중 오류가 발생했습니다.' }
    }
}

export async function updateSiteAdditional(
    siteId: string,
    additionalAmount: number,
    additionalDescription: string
): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: '인증되지 않은 사용자입니다.' }

        if (additionalAmount < 0) {
            return { success: false, error: '추가금은 0 이상이어야 합니다.' }
        }

        const { error } = await supabase
            .from('sites')
            .update({
                additional_amount: additionalAmount,
                additional_description: additionalDescription
            })
            .eq('id', siteId)

        if (error) {
            console.error('updateSiteAdditional error:', error)
            return { success: false, error: error.message }
        }

        revalidatePath(`/worker/sites/${siteId}`)
        revalidatePath('/admin/sites')
        return { success: true }
    } catch (error) {
        console.error('updateSiteAdditional error:', error)
        return { success: false, error: '추가금 수정 중 오류가 발생했습니다.' }
    }
}

export async function getSitePhotos(id: string): Promise<ActionResponse<SitePhoto[]>> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .eq('site_id', id)
            .order('created_at', { ascending: true })

        if (error) return { success: false, error: error.message }
        return { success: true, data: (data || []) as SitePhoto[] }
    } catch (error) {
        console.error('getSitePhotos error:', error)
        return { success: false, error: '사진 정보를 불러오는 중 오류가 발생했습니다.' }
    }
}

export async function deletePhoto(photoId: string, photoUrl: string, siteId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()

        // 1. Delete from Storage
        // Extract file path from URL
        // URL format: .../storage/v1/object/public/site-photos/siteId/type/filename
        const urlParts = photoUrl.split('/site-photos/')
        if (urlParts.length !== 2) {
            return { success: false, error: '잘못된 이미지 URL입니다.' }
        }
        const filePath = urlParts[1]

        const { error: storageError } = await supabase
            .storage
            .from('site-photos')
            .remove([filePath])

        if (storageError) {
            console.error('Storage delete error:', storageError)
            // Continue to delete from DB even if storage fails (orphan cleanup) or return error?
            // Safer to return error, or specific warning. For now, log and proceed?
            // Actually, if storage delete fails, better stop.
            return { success: false, error: '이미지 파일 삭제에 실패했습니다.' }
        }

        // 2. Delete from DB
        const { error: dbError } = await supabase
            .from('photos')
            .delete()
            .eq('id', photoId)

        if (dbError) {
            return { success: false, error: dbError.message }
        }

        // 3. Revalidate
        // Need siteId to revalidate. Since function params don't have it, we could fetch it first or revalidate global/generic paths.
        // Or we can return success and let client handle UI update, but revalidatePath is good.
        // We can fetch siteId from the deleted row if we did delete... but we deleted it.
        // Actually, we can get site_id before delete.

        // Optimization: Pass siteId from client if possible, or trigger a broad revalidation.
        // For now, let's just return success so client refreshes.

        return { success: true }
    } catch (error) {
        console.error('deletePhoto error:', error)
        return { success: false, error: '사진 삭제 중 오류가 발생했습니다.' }
    }
}

export async function getWorkerProfile() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return null

        const { data: profile, error } = await supabase
            .from('users')
            .select('*, companies(name)')
            .eq('id', user.id)
            .single()

        if (error) {
            console.error('Error fetching worker profile:', error)
            return null
        }

        return profile
    } catch (error) {
        console.error('Unexpected error in getWorkerProfile:', error)
        return null
    }
}

export async function updateWorkerProfile(phone: string, accountInfo?: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: '인증되지 않은 사용자입니다.' }

        // 1. Update User Profile
        const updateData: any = { phone }
        if (typeof accountInfo !== 'undefined') {
            updateData.account_info = accountInfo
        }

        const { error: userError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id)

        if (userError) {
            console.error('Error updating user profile:', userError)
            return { success: false, error: '프로필 업데이트에 실패했습니다.' }
        }

        // 2. Sync to Sites (Backfill style for this worker)
        // Only sync phone, not account info
        const { error: siteError } = await supabase
            .from('sites')
            .update({ worker_phone: phone })
            .eq('worker_id', user.id)

        if (siteError) {
            console.error('Error syncing sites worker_phone:', siteError)
        }

        revalidatePath('/worker/profile')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in updateWorkerProfile:', error)
        return { success: false, error: '프로필 업데이트 중 오류가 발생했습니다.' }
    }
}

export async function getCompanySmsSettings(): Promise<ActionResponse<{ sms_enabled: boolean; sms_bank_name: string; sms_account_number: string; sms_message_template: string; company_collection_message: string }>> {
    try {
        const { supabase, companyId } = await getAuthCompany()
        if (!companyId) return { success: false, error: '소속 업체를 찾을 수 없습니다.' }

        const { data, error } = await supabase
            .from('companies')
            .select('sms_enabled, sms_bank_name, sms_account_number, sms_message_template, company_collection_message')
            .eq('id', companyId)
            .single()

        if (error) return { success: false, error: error.message }
        return {
            success: true,
            data: {
                sms_enabled: data?.sms_enabled === true,
                sms_bank_name: data?.sms_bank_name || '',
                sms_account_number: data?.sms_account_number || '',
                sms_message_template: data?.sms_message_template || '',
                company_collection_message: data?.company_collection_message || ''
            }
        }
    } catch (error) {
        console.error('SMS Settings Error:', error)
        return { success: false, error: 'SMS 설정을 불러오는 중 오류가 발생했습니다.' }
    }
}

export async function requestPayment(siteId: string, amount: number, details: any[] = [], photos: string[] = []): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: '인증되지 않은 사용자' }

        const { error } = await supabase
            .from('sites')
            .update({
                claimed_amount: amount,
                payment_status: 'requested',
                claim_details: details,
                claim_photos: photos,
                claimed_by: user.id
            })
            .eq('id', siteId)

        if (error) throw new Error(error.message)

        revalidatePath('/worker/schedule')
        return { success: true }
    } catch (error) {
        console.error('Request Payment Error:', error)
        return { success: false, error: '비용 청구 중 오류가 발생했습니다.' }
    }
}

export async function requestWithdrawal(amount: number, bankInfo: { bank: string; account: string; holder: string }): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: '인증되지 않은 사용자입니다.' }

        // Use RPC for atomic processing: balance check + request insert + log creation
        const { data, error } = await supabase.rpc('request_withdrawal_v1', {
            p_user_id: user.id,
            p_amount: amount,
            p_bank_name: bankInfo.bank,
            p_account_number: bankInfo.account,
            p_account_holder: bankInfo.holder
        })

        if (error) {
            console.error('RPC Error (request_withdrawal_v1):', error)
            return { success: false, error: error.message }
        }

        if (data && !data.success) {
            return { success: false, error: data.error || '출금 요청 실패' }
        }

        revalidatePath('/worker/profile')
        return { success: true }
    } catch (error) {
        console.error('Request Withdrawal Error:', error)
        return { success: false, error: '출금 요청 중 오류가 발생했습니다.' }
    }
}

export async function getMyLogs() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: logs, error } = await supabase
        .from('wallet_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching worker logs:', error)
        return []
    }

    return logs
}

export async function uploadClaimPhoto(formData: FormData): Promise<ActionResponse<{ publicUrl: string }>> {
    try {
        const supabase = await createClient()
        const file = formData.get('file') as File
        const siteId = formData.get('siteId') as string

        if (!file || !siteId) return { success: false, error: '필수 항목이 누락되었습니다.' }

        const fileName = `claims/${siteId}/${uuidv4()}-${file.name}`

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
        console.error('Claim photo upload error:', error)
        return { success: false, error: '청구 사진 업로드 실패' }
    }
}

// 현장 메모 저장 (팀장 전용) + 팀원 푸시알림
export async function saveWorkerNotes(siteId: string, notes: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: '인증되지 않은 사용자' }

        // 현장 정보 조회 (이름 + 팀장 확인)
        const { data: site } = await supabase
            .from('sites')
            .select('name, worker_id')
            .eq('id', siteId)
            .single()

        if (!site) return { success: false, error: '현장을 찾을 수 없습니다.' }
        if (site.worker_id !== user.id) return { success: false, error: '팀장만 메모를 작성할 수 있습니다.' }

        // 메모 저장
        const { error } = await supabase
            .from('sites')
            .update({ worker_notes: notes || null, updated_at: new Date().toISOString() })
            .eq('id', siteId)

        if (error) return { success: false, error: error.message }

        // 배정된 팀원들에게 푸시알림
        if (notes && notes.trim()) {
            try {
                const { data: members } = await supabase
                    .from('site_members')
                    .select('user_id')
                    .eq('site_id', siteId)

                if (members && members.length > 0) {
                    const { sendPushToUser } = await import('@/actions/push')
                    await Promise.allSettled(
                        members.map(m => sendPushToUser(m.user_id, {
                            title: `📝 현장 메모 - ${site.name}`,
                            body: notes.length > 60 ? notes.slice(0, 60) + '…' : notes,
                            url: `/worker/sites/${siteId}`,
                            tag: `memo-${siteId}`
                        }))
                    )
                }
            } catch (pushError) {
                console.error('Push notification error:', pushError)
            }
        }

        return { success: true }
    } catch (error) {
        console.error('saveWorkerNotes error:', error)
        return { success: false, error: '메모 저장 중 오류가 발생했습니다.' }
    }
}

/** 완료된 현장을 워커 화면에서 숨기기 (관리자 페이지에는 영향 없음) */
export async function hideCompletedSite(siteId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: '인증되지 않은 사용자입니다.' }

        // 완료된 현장인지 확인
        const { data: site } = await supabase
            .from('sites')
            .select('status')
            .eq('id', siteId)
            .single()

        if (!site) return { success: false, error: '현장을 찾을 수 없습니다.' }
        if (site.status !== 'completed') return { success: false, error: '완료된 작업만 삭제할 수 있습니다.' }

        const { error } = await supabase
            .from('worker_hidden_sites')
            .upsert({
                user_id: user.id,
                site_id: siteId
            }, { onConflict: 'user_id,site_id' })

        if (error) {
            console.error('hideCompletedSite error:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/worker/home')
        return { success: true }
    } catch (error) {
        console.error('hideCompletedSite error:', error)
        return { success: false, error: '작업 삭제 중 오류가 발생했습니다.' }
    }
}
