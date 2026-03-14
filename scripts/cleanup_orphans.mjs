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
    .select('id')
    .eq('role', 'worker')
    .is('company_id', null);
  
  if (error) {
    console.error('Error fetching workers:', error);
    return;
  }
  
  if (orphans.length === 0) {
      console.log('No orphaned workers found.');
      return;
  }
  
  console.log(`Deleting ${orphans.length} orphaned workers...`);
  const orphanIds = orphans.map(o => o.id);
  
  // Delete from public.users
  const { error: delErr } = await supabase.from('users').delete().in('id', orphanIds);
  if (delErr) {
      console.error('Failed to delete from users', delErr);
  }
  
  // Delete from auth.users via admin API
  let count = 0;
  for (const id of orphanIds) {
      const { error: authErr } = await supabase.auth.admin.deleteUser(id);
      if (!authErr) count++;
  }
  console.log(`Successfully deleted ${count} auth users.`);
}
main();
