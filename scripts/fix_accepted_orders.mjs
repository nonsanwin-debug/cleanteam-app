import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixAcceptedOrders() {
  console.log('🔄 Searching for stuck accepted orders...')
  
  // Find orders that are accepted but not transferred
  const { data: orders, error: fetchError } = await supabase
    .from('shared_orders')
    .select('*')
    .eq('status', 'accepted')
    .not('accepted_by', 'is', null)

  if (fetchError) {
    console.error('Fetch error:', fetchError)
    return
  }

  if (!orders || orders.length === 0) {
    console.log('✅ No stuck orders found.')
    return
  }

  console.log(`Found ${orders.length} stuck order(s). Processing...`)

  for (const order of orders) {
    // Check if it has an address
    if (order.address) {
      console.log(`Processing order ${order.id}...`)
      
      // Get sender company name
      const { data: senderCompany } = await supabase
        .from('companies')
        .select('name')
        .eq('id', order.company_id)
        .single()

      const siteData = {
        company_id: order.accepted_by,
        name: order.site_name || order.customer_name || `${order.region} 현장`,
        address: order.address,
        customer_name: order.customer_name || null,
        customer_phone: order.customer_phone || null,
        cleaning_date: order.cleaning_date || order.work_date || null,
        start_time: order.start_time || null,
        residential_type: order.residential_type || null,
        structure_type: order.structure_type || null,
        area_size: order.area_size || null,
        balance_amount: order.balance_amount || 0,
        special_notes: order.special_notes || order.notes
            ? `[오더 공유: ${senderCompany?.name || '타업체'}] ${order.special_notes || order.notes}`
            : `[오더 공유: ${senderCompany?.name || '타업체'}]`,
        status: 'scheduled',
        payment_status: 'none',
        collection_type: order.collection_type || 'company'
      }

      // Insert into sites
      const { data: newSite, error: insertError } = await supabase
        .from('sites')
        .insert(siteData)
        .select('id')
        .single()

      if (insertError) {
        console.error(`Failed to insert site for order ${order.id}:`, insertError)
        continue
      }

      // Update shared_orders
      const { error: updateError } = await supabase
        .from('shared_orders')
        .update({
          transferred_site_id: newSite.id,
          status: 'transferred'
        })
        .eq('id', order.id)

      if (updateError) {
        console.error(`Failed to update order ${order.id}:`, updateError)
      } else {
        console.log(`✅ Order ${order.id} successfully transferred to site ${newSite.id}!`)
      }
    } else {
       console.log(`⏩ Order ${order.id} skipped (no address).`)
    }
  }
}

fixAcceptedOrders()
