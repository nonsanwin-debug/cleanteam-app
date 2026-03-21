import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data: sites } = await supabase.from('sites').select('id, name, address').order('created_at', { ascending: false }).limit(10)
  for (const site of sites) {
    if (site.address && site.address.includes('금호어울림')) {
      const parts = site.address.split('금호어울림')
      const base = parts[0].trim()
      const detail = ('금호어울림' + parts[1]).trim()
      
      console.log(`Fixing site ${site.id}:`)
      await supabase.from('sites').update({ name: detail, address: base }).eq('id', site.id)
    }
  }

  const { data: orders } = await supabase.from('shared_orders').select('id, address, parsed_details').order('created_at', { ascending: false }).limit(10)
  for (const order of orders) {
    if (order.address && order.address.includes('금호어울림')) {
      const parts = order.address.split('금호어울림')
      const base = parts[0].trim()
      const detail = ('금호어울림' + parts[1]).trim()
      
      const newParsed = order.parsed_details || {}
      newParsed.detail_address = detail
      
      console.log(`Fixing order ${order.id}:`)
      await supabase.from('shared_orders').update({ address: base, parsed_details: newParsed }).eq('id', order.id)
    }
  }
}
run()
