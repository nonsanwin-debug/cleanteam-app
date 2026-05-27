import dotenv from 'dotenv'

dotenv.config({ path: '.env.production.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  const url = `${supabaseUrl}/rest/v1/`
  console.log("Fetching from:", url)
  
  const res = await fetch(url, {
    method: 'HEAD',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  })

  console.log("HTTP Status:", res.status)
  console.log("Headers:")
  for (const [key, value] of res.headers.entries()) {
    console.log(`  ${key}: ${value}`)
  }
}

run()
