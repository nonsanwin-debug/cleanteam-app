const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('shared_orders').select('*');
  if (error) throw error;
  
  for (let order of data) {
    let details = order.parsed_details;
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch(e) {}
    }
    if (details && details.reward_type === 'discount') {
      const match = (order.region || '').match(/([\d.]+)만원/);
      if (match) {
        let currentManwon = parseFloat(match[1]);
        if (currentManwon === 44.8) {
           let newManwon = 40.32;
           let newRegion = order.region.replace('44.8만원', '40.32만원');
           let newTotalPrice = 403200;
           
           console.log(`Fixing order ${order.id}: ${order.region} -> ${newRegion}, price: ${order.total_price} -> ${newTotalPrice}`);
           
           await supabase.from('shared_orders').update({
             region: newRegion,
             total_price: newTotalPrice
           }).eq('id', order.id);
        }
      }
    }
  }
  console.log("Done");
}
run();
