import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
)

async function testLimits() {
    // 1. Get sites for the company (using 'cleaner' or something, let's just use all completed sites in 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: sites } = await supabase
        .from('sites')
        .select('id, name')
        .eq('status', 'completed')
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false })
        
    console.log(`Found ${sites?.length || 0} completed sites`)

    if (!sites || sites.length === 0) return

    const siteIds = sites.map(s => s.id)
    
    // Test fetch photos
    const { data: photos, error } = await supabase
        .from('photos')
        .select('site_id, type')
        .in('site_id', siteIds)
        
    console.log(`Fetched ${photos?.length || 0} photos`)
    
    if (photos && photos.length === 1000) {
        console.log("EXACTLY 1000 ROWS FETCHED - HITTING THE DEFAULT LIMIT = TRUE")
    }
}

testLimits()
