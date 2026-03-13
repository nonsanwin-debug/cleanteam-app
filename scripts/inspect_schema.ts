import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseSr = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectSchema() {
  const { data: companies } = await supabaseSr.from('companies').select('*').limit(1);
  const { data: users } = await supabaseSr.from('users').select('*').limit(1);
  
  const result = {
      companies: companies && companies.length > 0 ? Object.keys(companies[0]) : [],
      users: users && users.length > 0 ? Object.keys(users[0]) : [],
  };
  fs.writeFileSync('schema.json', JSON.stringify(result, null, 2));
}

inspectSchema();
