'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMasterAccess } from './master'
import { revalidatePath } from 'next/cache'

export interface PlatformSettings {
    global_free_old_building: boolean
    global_free_interior: boolean
}

const DEFAULT_SETTINGS: PlatformSettings = {
    global_free_old_building: false,
    global_free_interior: false,
}

/**
 * 플랫폼 전역 설정 조회 (서버 컴포넌트용)
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('platform_settings')
            .select('global_free_old_building, global_free_interior')
            .limit(1)
            .single()

        if (error || !data) {
            console.warn('platform_settings fetch failed, using defaults:', error?.message)
            return DEFAULT_SETTINGS
        }

        return {
            global_free_old_building: data.global_free_old_building ?? false,
            global_free_interior: data.global_free_interior ?? false,
        }
    } catch {
        return DEFAULT_SETTINGS
    }
}

/**
 * 플랫폼 전역 설정 업데이트 (마스터 전용)
 */
export async function updatePlatformSettings(
    settings: Partial<PlatformSettings>
): Promise<{ success: boolean; error?: string }> {
    try {
        const isMaster = await verifyMasterAccess()
        if (!isMaster) return { success: false, error: '권한이 없습니다.' }

        const adminClient = createAdminClient()

        // 기존 row가 있는지 확인
        const { data: existing } = await adminClient
            .from('platform_settings')
            .select('id')
            .limit(1)
            .single()

        if (existing) {
            const { error } = await adminClient
                .from('platform_settings')
                .update({
                    ...settings,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)

            if (error) {
                console.error('Error updating platform settings:', error)
                return { success: false, error: '설정 저장에 실패했습니다.' }
            }
        } else {
            // 최초 삽입
            const { error } = await adminClient
                .from('platform_settings')
                .insert({
                    global_free_old_building: settings.global_free_old_building ?? false,
                    global_free_interior: settings.global_free_interior ?? false,
                    updated_at: new Date().toISOString(),
                })

            if (error) {
                console.error('Error inserting platform settings:', error)
                return { success: false, error: '설정 초기화에 실패했습니다.' }
            }
        }

        revalidatePath('/master/settings')
        return { success: true }
    } catch (error) {
        console.error('updatePlatformSettings error:', error)
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}
