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

async function checkUser() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*, companies(name, status)')
    .eq('name', '이진수')
    
  if (error) {
    console.error('Error fetching user:', error)
    return
  }
  
  if (users.length === 0) {
    console.log('User not found.')
    return
  }
  
  console.log(JSON.stringify(users, null, 2))
}

checkUser()
