const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFetch() {
    const companyCode = '6382'
    console.log('Fetching for code:', companyCode)

    const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, promotion_page_enabled')
        .eq('code', companyCode)
        .single()

    if (companyError || !company) {
        console.error('Company error:', companyError)
        return
    }
    console.log('Company:', company)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('id, name, completed_at')
        .eq('company_id', company.id)
        .eq('status', 'completed')
        .eq('hidden_from_promotion', false)
        .gte('completed_at', thirtyDaysAgo.toISOString())

    console.log(`Found ${sites?.length || 0} sites for promotion`)

    if (sites && sites.length > 0) {
        const siteIds = sites.map(s => s.id)
        const { data: photos, error: photosError } = await supabase
            .from('photos')
            .select('site_id, url, type')
            .in('site_id', siteIds)
            .in('type', ['before', 'after'])

        console.log(`Found ${photos?.length || 0} photos`)

        if (photos && photos.length > 0) {
            console.log('Sample photo types:', [...new Set(photos.map(p => p.type))])
        }
    }
}

testFetch()
