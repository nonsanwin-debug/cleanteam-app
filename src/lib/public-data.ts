import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

function logError(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'public_data_error.log')
        fs.appendFileSync(logPath, new Date().toISOString() + ': ' + msg + '\n')
    } catch (e) {
        console.error('Failed to write log', e)
    }
}

export async function getPublicSiteDetails(id: string) {
    try {
        const supabase = await createClient()
        logError(`[getPublicSiteDetails] Fetching site with ID: ${id}`)

        // Debug: Check ID only
        const { data: idData, error: idError } = await supabase.from('sites').select('id').limit(1)
        if (idError) logError(`[DEBUG] ID Select Error: ${idError.message}`)
        else logError(`[DEBUG] ID Select Found: ${JSON.stringify(idData)}`)

        // Debug: Check All Columns
        const { data: allData, error: allError } = await supabase.from('sites').select('*').limit(1)
        if (allError) logError(`[DEBUG] All Select Error: ${allError.message}`)
        else logError(`[DEBUG] All Select Found: ${JSON.stringify(allData)}`)

        // Use RLS (Direct Table Query)
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
