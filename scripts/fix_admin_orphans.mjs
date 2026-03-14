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

async function fixOrphans() {
  const { data: admins, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'admin')
    .is('company_id', null);

  if (error || !admins) {
      console.log('Error fetching orphans', error);
      return;
  }
  
  if (admins.length === 0) {
      console.log('No orphans found, already fixed.');
      return;
  }

  for (const admin of admins) {
      const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const companyName = `${admin.name} 소속 (자동생성)`;
      console.log(`Creating company for ${admin.name} (${admin.id})`);

      // 1. Create company
      const { data: comp, error: compErr } = await supabase
          .from('companies')
          .insert({
              name: companyName,
              code: code,
              company_code: code,
              owner_id: admin.id,
              status: 'approved' // Fixed from 'active'
          })
          .select()
          .single();

      if (compErr) {
          console.error('Error creating company:', compErr.message)
          continue;
      }

      // 2. Link company to admin
      const { error: updErr } = await supabase
          .from('users')
          .update({ company_id: comp.id })
          .eq('id', admin.id);

      if (updErr) {
          console.error('Error updating admin:', updErr);
      } else {
          console.log(`Success -> ${admin.name} is now linked to ${comp.name}#${comp.code}`);
      }
  }
}

fixOrphans();
