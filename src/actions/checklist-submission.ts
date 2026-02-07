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
        // Convert Data URL to Blob (simplified for server action? Node environment might need Buffer)
        // Actually, Supabase Storage upload supports Blob/File/Buffer.
        // DataURL: "data:image/png;base64,iVBORw0KGgo..."

        const base64Data = signatureDataUrl.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        const fileName = `signatures/${siteId}_${uuidv4()}.png`

        const { error: uploadError } = await supabase
            .storage
            .from('site-photos') // Using same bucket for simplicity, or separate 'signatures' bucket
            .upload(fileName, buffer, {
                contentType: 'image/png'
            })

        if (uploadError) throw new Error('Signature upload failed: ' + uploadError.message)

        const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
        signatureUrl = publicUrl
    }

    // 2. Save Submission
    const { error } = await supabase
        .from('checklist_submissions')
        .insert([
            {
                site_id: siteId,
                worker_id: user.id,
                data: checklistData,
                signature_url: signatureUrl,
                status: 'submitted'
            }
        ])

    if (error) throw new Error(error.message)

    // 3. Update Site Status to 'completed'
    await supabase
        .from('sites')
        .update({ status: 'completed' })
        .eq('id', siteId)

    revalidatePath('/worker/home')
    return { success: true }
}
