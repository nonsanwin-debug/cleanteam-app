'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'

export type PartnerNotice = {
    id: string
    title: string
    content: string
    is_active: boolean
    created_at: string
}

/**
 * 활성 공지사항 조회 (파트너용)
 */
export async function getActiveNotices(): Promise<PartnerNotice[]> {
    noStore()
    try {
        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('partner_notices')
            .select('id, title, content, is_active, created_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('getActiveNotices error:', error)
            return []
        }
        return data || []
    } catch (err) {
        console.error('getActiveNotices unexpected:', err)
        return []
    }
}

/**
 * 전체 공지사항 조회 (마스터용)
 */
export async function getAllNotices(): Promise<PartnerNotice[]> {
    noStore()
    try {
        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('partner_notices')
            .select('id, title, content, is_active, created_at')
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error('getAllNotices error:', error)
            return []
        }
        return data || []
    } catch (err) {
        console.error('getAllNotices unexpected:', err)
        return []
    }
}

/**
 * 공지사항 생성 (마스터용)
 */
export async function createNotice(title: string, content: string) {
    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('partner_notices')
            .insert({ title, content, is_active: true })

        if (error) {
            console.error('createNotice error:', error)
            return { success: false, error: '생성 실패' }
        }

        revalidatePath('/master/settings')
        return { success: true }
    } catch (err) {
        console.error('createNotice unexpected:', err)
        return { success: false, error: '서버 오류' }
    }
}

/**
 * 공지사항 활성/비활성 토글
 */
export async function toggleNotice(id: string, isActive: boolean) {
    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('partner_notices')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            console.error('toggleNotice error:', error)
            return { success: false, error: '변경 실패' }
        }

        revalidatePath('/master/settings')
        return { success: true }
    } catch (err) {
        return { success: false, error: '서버 오류' }
    }
}

/**
 * 공지사항 삭제
 */
export async function deleteNotice(id: string) {
    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('partner_notices')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('deleteNotice error:', error)
            return { success: false, error: '삭제 실패' }
        }

        revalidatePath('/master/settings')
        return { success: true }
    } catch (err) {
        return { success: false, error: '서버 오류' }
    }
}
