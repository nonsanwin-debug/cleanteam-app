import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.production.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log("Fetching current platform settings...")
  const { data: existing, error: fetchError } = await supabase
    .from('platform_settings')
    .select('id, feed_alias_names')
    .limit(1)
    .single()

  if (fetchError || !existing) {
    console.error("Failed to fetch platform settings:", fetchError)
    return
  }

  console.log("Existing feed_alias_names:", existing.feed_alias_names)

  let currentNames = existing.feed_alias_names || []
  // Clean out duplicate metadata if any
  currentNames = currentNames.filter(n => !n.startsWith('__'))

  // Add the metadata flags to activate the launch hiding features
  currentNames.push('__hide_wallet_features:true')
  currentNames.push('__hide_admin_photo_zone_setup:true')
  currentNames.push('__hide_cleaning_fee_examples:true')

  console.log("Updating platform settings with new feed_alias_names:", currentNames)

  const { error: updateError } = await supabase
    .from('platform_settings')
    .update({
      feed_alias_names: currentNames,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id)

  if (updateError) {
    console.error("Failed to update platform settings:", updateError)
  } else {
    console.log("🎉 SUCCESS!!! Database updated successfully and settings are now active!")
  }
}

run()
