import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service role to bypass RLS initially
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users } = await supabase.from('users').select('*').eq('role', 'admin').limit(5);
  console.log("Admins:");
  for (const u of users || []) {
      if (!u.company_id) {
          console.log(`- ${u.name} NO COMPANY ID`);
          continue;
      }
      const { data: c } = await supabase.from('companies').select('*').eq('id', u.company_id).single();
      console.log(`- ${u.name} (company_id: ${u.company_id}) -> Found company? ${c ? c.name : 'NO'}`);
  }
}
run();
