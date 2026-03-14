import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function run() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')

  console.log('Public Users:', users)

  const { data: auth, error: authErr } = await supabase.auth.admin.listUsers()
  console.log('Auth Users Emails:', auth.users.map(u => u.email))
  console.log('Auth Users Meta:', auth.users.map(u => u.user_metadata))
}

run()
