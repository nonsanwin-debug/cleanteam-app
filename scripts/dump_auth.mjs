import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*)"?$/)
  if (match) env[match[1]] = match[2].replace(/"$/, '').trim()
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data: auth } = await supabase.auth.admin.listUsers()
  
  const results = auth.users.map(u => {
    return `Email: ${u.email} | MetaUsername: ${u.user_metadata?.username}`
  }).join('\n')

  fs.writeFileSync('auth_dump_all.txt', results)
  console.log('Dumped to auth_dump_all.txt. Total users: ' + auth.users.length)
}

run()
