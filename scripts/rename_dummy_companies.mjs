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
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .like('name', '%(자동생성)%');
    
  if (error) {
    console.error('Error fetching companies:', error);
    return;
  }
  
  if (companies.length === 0) {
      console.log('No dummy companies found.');
      return;
  }

  for (const comp of companies) {
      const newName = comp.name.replace(' 소속 (자동생성)', '');
      console.log(`Renaming ${comp.name} to ${newName}`);
      const { error: updErr } = await supabase
          .from('companies')
          .update({ name: newName })
          .eq('id', comp.id);
          
      if (updErr) {
          console.error(`Failed to rename ${comp.name}:`, updErr);
      }
  }
  console.log('Rename complete.');
}
main();
