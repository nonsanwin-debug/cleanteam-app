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
    .select('id, name, role, company_id, status, created_at')
    .ilike('name', '%김프로1%');

  if (error) {
    console.error('Error fetching latest admins:', error.message);
    return;
  }

  console.log('Target Users:');
  console.log(JSON.stringify(users, null, 2));

  for (const user of users) {
      if (user.company_id) {
          const { data: comp } = await supabase.from('companies').select('*').eq('id', user.company_id).single();
          console.log(`Company for ${user.name}:`, comp);
      } else {
          console.log(`User ${user.name} has no company_id! (Null)`);
      }
  }
}
main();
