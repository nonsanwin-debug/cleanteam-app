import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function syncAdmins() {
  console.log('Fetching approved companies with pending admins...')
  
  // Get all approved companies
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('status', 'approved')
    
  if (compError) {
    console.error('Error fetching companies:', compError)
    return
  }
  
  const companyIds = companies.map(c => c.id)
  if (companyIds.length === 0) {
    console.log('No approved companies found.')
    return
  }
  
  // Find pending users in these companies
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name, company_id, status')
    .in('company_id', companyIds)
    .eq('status', 'pending')
    
  if (userError) {
    console.error('Error fetching users:', userError)
    return
  }
  
  if (users.length === 0) {
    console.log('No pending users found in approved companies.')
    return
  }
  
  console.log(`Found ${users.length} stuck pending users. Updating to active...`)
  
  for (const user of users) {
    const comp = companies.find(c => c.id === user.company_id)
    console.log(`- Updating user ${user.name} from company ${comp.name}`)
    
    // update status
    const { error: updateError } = await supabase
      .from('users')
      .update({ status: 'active' })
      .eq('id', user.id)
      
    if (updateError) {
      console.error(`Error updating user ${user.name}:`, updateError)
    }
  }
  
  console.log('Done.')
}

syncAdmins()
