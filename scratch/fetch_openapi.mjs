import dotenv from 'dotenv'

dotenv.config({ path: '.env.production.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  const url = `${supabaseUrl}/rest/v1/`
  console.log("Fetching OpenAPI spec from:", url)
  
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Accept': 'application/openapi+json'
    }
  })

  if (!res.ok) {
    console.error("Failed to fetch:", res.status, res.statusText)
    return
  }

  const data = await res.json()
  console.log("Exposed Paths:")
  const paths = Object.keys(data.paths)
  paths.forEach(p => console.log(" -", p))
}

run()
