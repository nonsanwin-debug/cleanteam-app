import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envFile = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*)"?$/)
  if (match) env[match[1]] = match[2].replace(/"$/, '').trim()
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  console.log('--- Checking for spaced company names in public.companies ---')
  
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '% %')

  if (error) {
    console.error('Failed to fetch companies:', error)
    return
  }

  if (!companies || companies.length === 0) {
    console.log('No companies found with spaces in their name.')
  } else {
    for (const company of companies) {
      const oldName = company.name
      const newName = oldName.replace(/\s+/g, '')
      console.log(`Updating company: '${oldName}' -> '${newName}'`)
      
      const { error: updateErr } = await supabase
        .from('companies')
        .update({ name: newName })
        .eq('id', company.id)

      if (updateErr) {
         console.error(`Failed to update company ${company.id}:`, updateErr.message)
      } else {
         console.log(`✅ Successfully updated company name.`)
      }
    }
  }

  console.log('\n--- Checking auth.users metadata for spaced company_name ---')
  const { data: auth, error: authErr } = await supabase.auth.admin.listUsers()
  if (authErr) {
    console.error('Failed to fetch auth users:', authErr)
    return
  }

  let userUpdates = 0
  for (const user of auth.users) {
    const metaCompanyName = user.user_metadata?.company_name
    if (metaCompanyName && metaCompanyName.includes(' ')) {
       const newMetaName = metaCompanyName.replace(/\s+/g, '')
       console.log(`Updating user ${user.email} metadata company_name: '${metaCompanyName}' -> '${newMetaName}'`)

       const { error: uErr } = await supabase.auth.admin.updateUserById(user.id, {
         user_metadata: { ...user.user_metadata, company_name: newMetaName }
       })

       if (uErr) {
         console.error(`Failed to update user ${user.id}:`, uErr.message)
       } else {
         userUpdates++
       }
    }
  }
  
  console.log(`\nFinished check. Updated ${userUpdates} user metadata records.`)
}

run()
