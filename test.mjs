import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data, error } = await client.from('companies').insert({ name: 'Test Agency 3', status: 'approved', code: '9997', company_code: '9997' }).select()
  console.log('Result:', { data, error })
  
  if (data) {
      // Cleanup
      await client.from('companies').delete().eq('id', data[0].id)
  }
}
test()
