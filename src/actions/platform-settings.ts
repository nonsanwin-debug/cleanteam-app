'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMasterAccess } from './master'
import { revalidatePath } from 'next/cache'

export interface PlatformSettings {
    global_free_old_building: boolean
    global_free_interior: boolean
    hide_wallet_features: boolean
    hide_admin_photo_zone_setup: boolean
    hide_cleaning_fee_examples: boolean
    disable_deleted_site_reporting: boolean
}

const DEFAULT_SETTINGS: PlatformSettings = {
    global_free_old_building: false,
    global_free_interior: false,
    hide_wallet_features: false,
    hide_admin_photo_zone_setup: false,
    hide_cleaning_fee_examples: false,
    disable_deleted_site_reporting: true, // Default to true (not reported)
}

/**
 * 플랫폼 전역 설정 조회 (서버 컴포넌트용)
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('platform_settings')
            .select('global_free_old_building, global_free_interior, feed_alias_names')
            .limit(1)
            .single()

        if (error || !data) {
            console.warn('platform_settings fetch failed, using defaults:', error?.message)
            return DEFAULT_SETTINGS
        }

        const aliasNames: string[] = data.feed_alias_names || []
        const hide_wallet_features = aliasNames.includes('__hide_wallet_features:true')
        const hide_admin_photo_zone_setup = aliasNames.includes('__hide_admin_photo_zone_setup:true')
        const hide_cleaning_fee_examples = aliasNames.includes('__hide_cleaning_fee_examples:true')
        // Reporting is disabled by default unless explicitly set to false
        const disable_deleted_site_reporting = !aliasNames.includes('__disable_deleted_site_reporting:false')

        return {
            global_free_old_building: data.global_free_old_building ?? false,
            global_free_interior: data.global_free_interior ?? false,
            hide_wallet_features,
            hide_admin_photo_zone_setup,
            hide_cleaning_fee_examples,
            disable_deleted_site_reporting,
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
            .select('id, feed_alias_names, global_free_old_building, global_free_interior')
            .limit(1)
            .single()

        let currentAliasNames: string[] = existing?.feed_alias_names || []
        // Clean out existing metadata keys starting with '__'
        currentAliasNames = currentAliasNames.filter(n => !n.startsWith('__'))

        // Resolve new settings
        const newSettingsObj = {
            global_free_old_building: settings.global_free_old_building !== undefined 
                ? settings.global_free_old_building 
                : (existing?.global_free_old_building ?? false),
            global_free_interior: settings.global_free_interior !== undefined 
                ? settings.global_free_interior 
                : (existing?.global_free_interior ?? false),
        }

        const hideWallet = settings.hide_wallet_features !== undefined
            ? settings.hide_wallet_features
            : (existing?.feed_alias_names || []).includes('__hide_wallet_features:true')
        const hidePhoto = settings.hide_admin_photo_zone_setup !== undefined
            ? settings.hide_admin_photo_zone_setup
            : (existing?.feed_alias_names || []).includes('__hide_admin_photo_zone_setup:true')
        const hideExamples = settings.hide_cleaning_fee_examples !== undefined
            ? settings.hide_cleaning_fee_examples
            : (existing?.feed_alias_names || []).includes('__hide_cleaning_fee_examples:true')
        const disableReporting = settings.disable_deleted_site_reporting !== undefined
            ? settings.disable_deleted_site_reporting
            : !(existing?.feed_alias_names || []).includes('__disable_deleted_site_reporting:false')

        if (hideWallet) currentAliasNames.push('__hide_wallet_features:true')
        if (hidePhoto) currentAliasNames.push('__hide_admin_photo_zone_setup:true')
        if (hideExamples) currentAliasNames.push('__hide_cleaning_fee_examples:true')
        if (!disableReporting) currentAliasNames.push('__disable_deleted_site_reporting:false')

        if (existing) {
            const { error } = await adminClient
                .from('platform_settings')
                .update({
                    global_free_old_building: newSettingsObj.global_free_old_building,
                    global_free_interior: newSettingsObj.global_free_interior,
                    feed_alias_names: currentAliasNames,
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
                    global_free_old_building: newSettingsObj.global_free_old_building,
                    global_free_interior: newSettingsObj.global_free_interior,
                    feed_alias_names: currentAliasNames,
                    updated_at: new Date().toISOString(),
                })

            if (error) {
                console.error('Error inserting platform settings:', error)
                return { success: false, error: '설정 초기화에 실패했습니다.' }
            }
        }

        revalidatePath('/master/settings')
        revalidatePath('/master/launch-control')
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error) {
        console.error('updatePlatformSettings error:', error)
        return { success: false, error: '서버 오류가 발생했습니다.' }
    }
}
