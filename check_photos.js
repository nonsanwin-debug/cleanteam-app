const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPhotos() {
    const { data: companies } = await supabase.from('companies').select('id, name, code, promotion_page_enabled').eq('promotion_page_enabled', true)

    if (!companies || companies.length === 0) {
        console.log("No enabled companies found")
        return
    }

    for (const company of companies) {
        console.log(`\nCompany: ${company.name} (${company.code})`)
        const { data: sites } = await supabase.from('sites').select('id, name, completed_at').eq('company_id', company.id).eq('status', 'completed')

        if (!sites || sites.length === 0) {
            console.log("  No completed sites")
            continue
        }
        console.log(`  Found ${sites.length} completed sites. Checking photos...`)

        const siteIds = sites.map(s => s.id)
        const { data: photos } = await supabase.from('photos').select('site_id, type').in('site_id', siteIds)

        if (!photos || photos.length === 0) {
            console.log("  NO PHOTOS FOUND for these sites")
        } else {
            console.log(`  Found ${photos.length} total photos`)
            const before = photos.filter(p => p.type === 'before').length
            const after = photos.filter(p => p.type === 'after').length
            console.log(`  - ${before} before photos, ${after} after photos`)
        }
    }
}

checkPhotos()
