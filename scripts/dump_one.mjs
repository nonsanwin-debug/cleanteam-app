import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*)"?$/)
  if (match) env[match[1]] = match[2].replace(/"$/, '').trim()
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  const { data: users, error: uErr } = await supabase.from('users').select('*').limit(1)
  if (uErr) console.error(uErr)
  console.log('--- USER RAW ---')
  console.log(users ? users[0] : 'No users')

  const { data: workers, error: wErr } = await supabase.from('workers').select('*').limit(1)
  if (wErr) console.error(wErr)
  console.log('--- WORKER RAW ---')
  console.log(workers ? workers[0] : 'No workers')

  const { data: auth } = await supabase.auth.admin.listUsers()
  if (auth && auth.users) {
    const spacedUsers = auth.users.filter(u => u.email && u.email.includes(' '))
    console.log('--- SPACED AUTH USERS ---')
    console.log(spacedUsers)
  }
}

run()
