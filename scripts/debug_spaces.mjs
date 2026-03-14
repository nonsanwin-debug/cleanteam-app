import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function run() {
  const { data: auth, error: authErr } = await supabase.auth.admin.listUsers()

  console.log('--- Checking User IDs for spaces ---')
  auth.users.forEach(u => {
    const rawUsername = u.user_metadata?.username || ''
    const emailPrefix = u.email ? u.email.split('@')[0] : ''

    const hasSpaceMeta = rawUsername.includes(' ')
    const hasSpaceEmail = emailPrefix.includes(' ')

    if (hasSpaceMeta || hasSpaceEmail || emailPrefix.includes('%20')) {
      console.log(`FOUND ISSUE -> Auth ID: ${u.id}`)
      console.log(`  Email: ${u.email}`)
      console.log(`  Raw Username (Meta): '${rawUsername}'`)
    }
  })

  // Check public.users for any usernames with spaces
  const { data: users, error } = await supabase.from('users').select('*')
  users.forEach(u => {
    if (u.name?.includes(' ')) {
       console.log(`FOUND SPACE IN NAME -> Public ID: ${u.id}, Name: '${u.name}'`)
    }
  })

}

run()
