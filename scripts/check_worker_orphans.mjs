import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
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
  const { data: orphans, error } = await supabase
    .from('users')
    .select('id, name, phone, role, company_id')
    .eq('role', 'worker')
    .is('company_id', null);
  
  if (error) {
    console.error('Error fetching workers:', error);
    return;
  }
  
  console.log('Orphaned workers:', JSON.stringify(orphans, null, 2));

  // If there are orphaned workers, we can either reassign them to Kim Pro (김프로) or just leave it to the user.
  // The user probably just made a few dummy test workers. Let's see how many there are.
}
main();
