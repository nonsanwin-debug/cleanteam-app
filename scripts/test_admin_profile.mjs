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
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, role, company_id, companies(name, code)')
    .eq('role', 'admin')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  fs.writeFileSync('scripts/admins.json', JSON.stringify(users, null, 2));
  console.log('Saved admins to scripts/admins.json');
}

main();
