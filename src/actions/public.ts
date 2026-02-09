'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

function logError(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'public_error.log')
        fs.appendFileSync(logPath, new Date().toISOString() + ': ' + msg + '\n')
    } catch (e) {
        console.error('Failed to write log', e)
    }
}

export async function getPublicSiteDetails(id: string) {
    try {
        const supabase = await createClient()
        logError(`[getPublicSiteDetails] START Fetching site with ID: ${id}`)

        // Log ENV (Masked)
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING'
        logError(`[DIAGNOSTIC] URL: ${url}`)
        logError(`[DIAGNOSTIC] Key: ${key.substring(0, 10)}...`)

        // 0. Check Role
        const { data: role, error: roleError } = await supabase.rpc('get_my_role')
        if (roleError) {
            logError(`[DIAGNOSTIC] Role Check Failed: ${roleError.message}`)
        } else {
            logError(`[DIAGNOSTIC] Current Role: ${role}`)
        }

        // 1. Check Marker
        const { count: markerCount, error: markerError } = await supabase.from('db_marker').select('*', { count: 'exact', head: true })
        if (markerError) {
            logError(`[DIAGNOSTIC] Marker Check Failed: ${markerError.message}`)
        } else {
            logError(`[DIAGNOSTIC] Marker Count: ${markerCount}`)
        }

        // 2. Check Sites (Simple Select)
        const { data: anySite, error: anySiteError } = await supabase.from('sites').select('id').limit(1)
        if (anySiteError) {
            logError(`[DIAGNOSTIC] Any Site Check Failed: ${anySiteError.message}`)
        } else {
            logError(`[DIAGNOSTIC] Any Site Found: ${JSON.stringify(anySite)}`)
        }

        // 3. Fetch Specific Site
        const { data, error } = await supabase
            .from('sites')
            .select('*')
            .eq('id', id)

        if (error) {
            logError(`[getPublicSiteDetails] Query Error: ${error.message}`)
            throw new Error(`Query Error: ${error.message}`)
        }

        if (!data || data.length === 0) {
            logError(`[getPublicSiteDetails] No site found for ID: ${id}`)
            return null
        }

        logError(`[getPublicSiteDetails] Site found: ${data[0].id}`)
        return data[0]
    } catch (err) {
        logError(`[getPublicSiteDetails] Unexpected error: ${err}`)
        console.error('[getPublicSiteDetails] Unexpected error:', err)
        return null
    }
}

export async function getPublicSitePhotos(siteId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .eq('site_id', siteId)
            .order('created_at', { ascending: true })

        if (error) {
            logError(`[getPublicSitePhotos] Query Error: ${error.message}`)
            throw new Error(error.message)
        }
        return data || []
    } catch (err) {
        logError(`[getPublicSitePhotos] error: ${err}`)
        return []
    }
}

export async function getPublicChecklistForSite(siteId: string) {
    try {
        const supabase = await createClient()

        const { data: site, error: siteError } = await supabase
            .from('sites')
            .select('template_id')
            .eq('id', siteId)
            .single()

        if (siteError || !site) return null

        const templateId = site.template_id
        let template = null

        if (templateId) {
            const { data, error } = await supabase
                .from('checklist_templates')
                .select('*')
                .eq('id', templateId)
                .single()

            if (!error && data) template = data
        }

        if (!template) {
            const { data, error } = await supabase
                .from('checklist_templates')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (!error && data) template = data
        }

        return template
    } catch (err) {
        logError(`getPublicChecklistForSite error: ${err}`)
        return null
    }
}

export async function getPublicChecklistSubmission(siteId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('checklist_submissions')
            .select('*')
            .eq('site_id', siteId)
            // Handle duplicates gracefully by taking the most recent one
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            logError(`getPublicChecklistSubmission query error: ${error.message}`)
            return null
        }
        return data
    } catch (err) {
        logError(`getPublicChecklistSubmission error: ${err}`)
        return null
    }
}

export async function submitPublicChecklist(siteId: string, data: any, signatureDataUrl: string) {
    try {
        const supabase = await createClient()

        let signatureUrl = null
        if (signatureDataUrl) {
            const base64Data = signatureDataUrl.split(',')[1]
            const buffer = Buffer.from(base64Data, 'base64')
            const fileName = `signatures/${siteId}_${uuidv4()}.png`

            const { error: uploadError } = await supabase
                .storage
                .from('site-photos')
                .upload(fileName, buffer, {
                    contentType: 'image/png'
                })

            if (uploadError) {
                logError(`Signature upload error: ${uploadError.message}`)
                throw new Error('서명 이미지 업로드에 실패했습니다. 관리자에게 문의하세요.')
            }

            const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
            signatureUrl = publicUrl
        }

        const { data: submission, error: submissionError } = await supabase
            .from('checklist_submissions')
            .upsert({
                site_id: siteId,
                data: data,
                signature_url: signatureUrl,
                status: 'submitted',
                updated_at: new Date().toISOString()
            }, { onConflict: 'site_id' })
            .select()
            .single()

        if (submissionError) {
            logError(`Submission Upsert Error: ${submissionError.message}`)
            throw new Error(submissionError.message)
        }

        // Use RPC to bypass RLS for site update
        const { error: updateError } = await supabase.rpc('complete_site_public', {
            target_site_id: siteId
        })

        if (updateError) {
            logError(`Site Update RPC Error: ${updateError.message}`)
            // Fallback: try direct update if RPC fails (e.g. not run yet)
            const { error: directError } = await supabase
                .from('sites')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', siteId)

            if (directError) {
                logError(`Site Update Direct Error: ${directError.message}`)
                throw new Error(directError.message)
            }
        }

        revalidatePath(`/share/${siteId}`)
        return { success: true }
    } catch (err) {
        logError(`submitPublicChecklist error: ${JSON.stringify(err)}`)
        return { success: false, error: `제출 실패: ${err instanceof Error ? err.message : String(err)}` }
    }
}
