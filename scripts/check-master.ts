import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, role, email, company_id, companies(name, code)')
    .eq('role', 'master');
    
  console.log('Master users:', JSON.stringify(users, null, 2));

  // If company_id is null or not linked to NEXUS 시스템, let's fix it.
  if (users && users.length > 0) {
    const user = users[0];
    if (user.companies?.code !== 'MSTR') {
      console.log('Linking to NEXUS 시스템...');
      const { data: nexus } = await supabase.from('companies').select('id').eq('code', 'MSTR').single();
      if (nexus) {
        await supabase.from('users').update({ company_id: nexus.id }).eq('id', user.id);
        console.log('Linked nexusadmin to NEXUS 시스템.');
      }
    }
  }
}
check();
