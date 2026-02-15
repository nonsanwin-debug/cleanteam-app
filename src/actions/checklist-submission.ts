'use server'

import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { revalidatePath } from 'next/cache'

// Note: In a real app, we would fetch the specific template assigned to the site.
// For MVP, we will fetch the LATEST template if no template_id is assigned, or specific one if assigned.
export async function getChecklistForSite(siteId: string) {
    const supabase = await createClient()

    // 1. Get Site Info (to check template_id - assuming we added it, but fallback needed)
    const { data: site } = await supabase.from('sites').select('template_id').eq('id', siteId).single()

    let templateId = site?.template_id

    // 2. If no template assigned, grab the most recent one (Fallback)
    if (!templateId) {
        const { data: latest } = await supabase
            .from('checklist_templates')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        templateId = latest?.id
    }

    if (!templateId) return null

    // 3. Fetch Template Questions
    const { data: template } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('id', templateId)
        .single()

    return template
}

export async function submitChecklist(
    siteId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checklistData: any,
    signatureDataUrl: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthenticated')

    let signatureUrl = null

    // 1. Upload Signature Image
    if (signatureDataUrl) {
        // Check if signature already acts as a URL (e.g. from previous save)
        if (signatureDataUrl.startsWith('http')) {
            signatureUrl = signatureDataUrl
        } else {
            const base64Data = signatureDataUrl.split(',')[1]
            const buffer = Buffer.from(base64Data, 'base64')
            const fileName = `signatures/${siteId}_${uuidv4()}.png`

            const { error: uploadError } = await supabase
                .storage
                .from('site-photos')
                .upload(fileName, buffer, {
                    contentType: 'image/png'
                })

            if (uploadError) throw new Error('Signature upload failed: ' + uploadError.message)

            const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
            signatureUrl = publicUrl
        }
    }

    // 2. Save Submission (Upsert)
    const { error } = await supabase
        .from('checklist_submissions')
        .upsert({
            site_id: siteId,
            worker_id: user.id,
            data: checklistData,
            signature_url: signatureUrl,
            status: 'submitted'
        }, {
            onConflict: 'site_id'
        })

    if (error) throw new Error(error.message)

    // 3. Update Site Status and Completion Time
    const { error: updateError } = await supabase
        .from('sites')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as any)
        .eq('id', siteId)

    if (updateError) {
        console.error('Error updating site status:', updateError)
        // We generally shouldn't throw here if checklist was saved, but consistency is good.
    }

    revalidatePath('/worker/home')
    return { success: true }
}

export async function saveChecklistProgress(
    siteId: string,
    checklistData: any,
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthenticated')

    // Use Upsert since the unique constraint exists (checklist_submissions_site_id_key)
    const { error } = await supabase
        .from('checklist_submissions')
        .upsert({
            site_id: siteId,
            worker_id: user.id,
            data: checklistData,
            status: 'pending',
            updated_at: new Date().toISOString() // Restore updated_at
        }, {
            onConflict: 'site_id'
        })

    if (error) {
        console.error('saveChecklistProgress DB Error:', error)
        return { success: false, error: error.message }
    }

    // sites.updated_at 업데이트 → Realtime 구독자(고객 페이지 등)에게 변경 전파
    await supabase
        .from('sites')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', siteId)

    return { success: true }
}
