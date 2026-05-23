import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

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
  console.log("Testing insertPhotoRecord with '안방_before'...")
  
  // Find a valid site ID to test with
  const { data: sites, error: siteError } = await supabase.from('sites').select('id, name').limit(1)
  if (siteError || !sites || sites.length === 0) {
    console.error("Failed to find a site to test:", siteError)
    process.exit(1)
  }
  
  const siteId = sites[0].id
  console.log(`Using site: ${sites[0].name} (${siteId})`)

  const testType = '안방_before'
  const testUrl = 'https://example.com/test-photo.jpg'

  const { data, error } = await supabase
    .from('photos')
    .insert([
      {
        site_id: siteId,
        url: testUrl,
        type: testType,
      }
    ])
    .select()

  if (error) {
    console.error("❌ DB INSERT FAILED:")
    console.error(error)
  } else {
    console.log("✅ DB INSERT SUCCESSFUL:", data)
    
    // Clean up
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', data[0].id)
    if (deleteError) {
      console.error("Failed to clean up test photo:", deleteError)
    } else {
      console.log("Cleaned up test photo successfully.")
    }
  }
}

test().catch(console.error)
