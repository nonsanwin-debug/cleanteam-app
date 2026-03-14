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
  const { data: users, error } = await supabase
    .from('users')
    .select('id')
    .ilike('name', '%김프로1%');
    
  if (error || !users || users.length === 0) {
      console.log('No users found.');
      return;
  }
  
  console.log(`Deleting ${users.length} broken test admins...`);
  const userIds = users.map(u => u.id);
  
  // 1. Delete from users table (though CASCADE on auth.users delete might do this)
  const { error: delErr } = await supabase.from('users').delete().in('id', userIds);
  if (delErr) {
      console.error('Failed to delete from users', delErr);
  }
  
  // 2. Delete from auth.users via admin API
  let count = 0;
  for (const id of userIds) {
      const { error: authErr } = await supabase.auth.admin.deleteUser(id);
      if (!authErr) count++;
  }
  console.log(`Successfully deleted ${count} auth users.`);
}
main();
