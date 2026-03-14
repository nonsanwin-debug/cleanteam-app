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
  const { data: users } = await supabase.from('users').select('*').limit(5)
  console.log('--- ALL PUBLIC.USERS (Sample) ---')
  console.log(users.map(u => ({ id: u.id, name: u.name, username: u.username })))

  const { data: members, error: mErr } = await supabase.from('site_members').select('*').limit(5)
  if (mErr) console.log('Site_members error:', mErr)
  console.log('--- SITE_MEMBERS ---')
  console.log(members)
}

run()
