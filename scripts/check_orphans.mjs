import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*)"?$/);
  if (match) env[match[1]] = match[2].replace(/"$/, '');
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: admins, error } = await supabase
    .from('users')
    .select('id, name, email, role, company_id')
    .eq('role', 'admin')
    .is('company_id', null);
  
  if (error) {
    console.error('Error fetching admins:', error);
    return;
  }
  
  console.log('Admins with null company_id:');
  console.log(JSON.stringify(admins, null, 2));

  // Check if they own any companies
  const adminIds = admins.map(a => a.id);
  if (adminIds.length > 0) {
      const { data: ownedCompanies, error: compError } = await supabase
        .from('companies')
        .select('*')
        .in('owner_id', adminIds);
        
      console.log('\nOwned companies by these admins:');
      console.log(JSON.stringify(ownedCompanies, null, 2));
  }
}

main();
