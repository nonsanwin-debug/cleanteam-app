import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data: users } = await supabase.from('users').select('*').limit(1)
  console.log('User keys:', Object.keys(users[0] || {}))

  const { data: auth, error: authErr } = await supabase.auth.admin.listUsers()
  
  if (auth?.users?.length) {
    const rawEmails = auth.users.map(u => u.email)
    console.log('\n--- Auth Emails ---')
    // We already checked this but verify if there are trailing/leading or weird spaces
    const spaceMails = rawEmails.filter(e => e.includes(' ') || e.includes('%20'))
    console.log('Emails with space:', spaceMails)
  }

  // Check workers table (team leaders/members)
  const { data: workers } = await supabase.from('workers').select('*').limit(1)
  console.log('\nWorker keys:', Object.keys(workers[0] || {}))
}

run()
