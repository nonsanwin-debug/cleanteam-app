import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function fixStuckOrders() {
    console.log("Fetching accepted orders...")
    const { data: orders, error } = await supabase
        .from('shared_orders')
        .select('*')
        .eq('status', 'accepted')

    if (error) {
        console.error("Error fetching orders:", error)
        return
    }

    console.log(`Found ${orders?.length || 0} stuck orders.`)

    for (const order of (orders || [])) {
        console.log(`Fixing order ${order.id}...`)
        
        // 1. Create site record
        const { data: senderCompany } = await supabase
            .from('companies')
            .select('name')
            .eq('id', order.company_id)
            .single()

        const { data: parsedDetails } = await supabase
             .from('shared_orders')
             .select('parsed_details')
             .eq('id', order.id)
             .single()

        const pd = parsedDetails?.parsed_details || {}

        const siteData = {
            company_id: order.accepted_by,
            name: order.site_name || order.customer_name || `${order.region} 현장`,
            address: order.address,
            customer_name: order.customer_name || null,
            customer_phone: order.customer_phone || null,
            cleaning_date: order.cleaning_date || order.work_date || null,
            start_time: order.start_time || null,
            residential_type: pd.residential_type || null,
            structure_type: pd.structure_type || null,
            area_size: order.area_size || pd.area_size || null,
            balance_amount: order.balance_amount || 0,
            special_notes: order.special_notes || order.notes
                ? `[오더 공유: ${senderCompany?.name || '타업체'}] ${order.special_notes || order.notes}`
                : `[오더 공유: ${senderCompany?.name || '타업체'}]`,
            status: 'scheduled',
            payment_status: 'none',
            collection_type: order.collection_type || 'company'
        }

        const { data: site, error: siteErr } = await supabase
            .from('sites')
            .insert(siteData)
            .select('id')
            .single()

        if (siteErr) {
            console.error(`Failed to create site for order ${order.id}:`, siteErr)
            continue
        }

        // 2. Update order status to transferred
        const { error: updateErr } = await supabase
            .from('shared_orders')
            .update({
                status: 'transferred',
                transferred_site_id: site.id
            })
            .eq('id', order.id)

        if (updateErr) {
            console.error(`Failed to update order status for ${order.id}:`, updateErr)
            continue
        }

        console.log(`Successfully fixed order ${order.id}. New site id: ${site.id}`)
    }
}

fixStuckOrders()
