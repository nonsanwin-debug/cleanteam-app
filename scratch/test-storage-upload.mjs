import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing URL or Key")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Testing Supabase Storage upload with safe ASCII path...")

  // Find a valid site ID to test with
  const { data: sites, error: siteError } = await supabase.from('sites').select('id, name').limit(1)
  if (siteError || !sites || sites.length === 0) {
    console.error("Failed to find a site to test:", siteError)
    process.exit(1)
  }
  
  const siteId = sites[0].id
  
  const fileName = `${siteId}/photos/test-safe-path-${Date.now()}.jpg`
  const dummyFileContent = Buffer.from('dummy-image-content')

  console.log(`Uploading to: site-photos/${fileName}`)

  const { data, error } = await supabase
    .storage
    .from('site-photos')
    .upload(fileName, dummyFileContent, {
      contentType: 'image/jpeg',
      upsert: true
    })

  if (error) {
    console.error("❌ STORAGE UPLOAD FAILED:")
    console.error(error)
  } else {
    console.log("✅ STORAGE UPLOAD SUCCESSFUL:", data)

    // Clean up
    const { error: deleteError } = await supabase
      .storage
      .from('site-photos')
      .remove([fileName])
      
    if (deleteError) {
      console.error("Failed to clean up test storage object:", deleteError)
    } else {
      console.log("Cleaned up test storage object successfully.")
    }
  }
}

test().catch(console.error)
