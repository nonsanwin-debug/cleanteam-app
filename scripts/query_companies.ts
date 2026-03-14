import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, code, owner_id, points, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching companies:', error)
    return
  }
  
  console.log("Recent companies:")
  console.table(companies)
}

main()
