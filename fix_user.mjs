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

async function fixUser() {
  const { data, error } = await supabase
    .from('users')
    .update({ status: 'active' })
    .eq('name', '이진수')
    .select()
    
  if (error) {
    console.error('Error updating user:', error)
  } else {
    console.log('Successfully updated user(s):', data)
  }
}

fixUser()
