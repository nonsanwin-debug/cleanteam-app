import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  console.log('Fetching all authentication records...')

  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers()
  if (authErr) {
    console.error('Failed to list users:', authErr)
    return
  }

  const users = authData.users
  let updatedCount = 0

  for (const user of users) {
    const hasSpaceInEmail = user.email?.includes(' ')
    const hasSpaceInMeta = user.user_metadata?.username?.includes(' ')

    if (hasSpaceInEmail || hasSpaceInMeta) {
      console.log(`Found spaced user ID: ${user.email} (meta: ${user.user_metadata?.username})`)
      
      const newEmail = user.email ? user.email.replace(/\s+/g, '') : undefined
      const newMetaUsername = user.user_metadata?.username ? user.user_metadata.username.replace(/\s+/g, '') : undefined
      
      const updates = {}
      if (hasSpaceInEmail) updates.email = newEmail
      if (hasSpaceInMeta) {
        updates.user_metadata = { ...user.user_metadata, username: newMetaUsername }
      }

      console.log(` -> Updating to ${newEmail} / ${newMetaUsername}`)

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, updates)
      if (updateError) {
        console.error(` ❌ Failed to update ${user.id}:`, updateError.message)
      } else {
        console.log(` ✅ Successfully updated.`)
        updatedCount++
      }
    }
  }

  console.log(`\nFinished: checked ${users.length} users, updated ${updatedCount}.`)
}

run()
