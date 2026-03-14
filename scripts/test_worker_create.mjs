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

const adminClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function simulateCreateWorker(companyId, companyName, companyCode) {
  const loginId = `testworker_${Math.floor(Math.random() * 100000)}`;
  const email = `${loginId}@cleanteam.temp`;
  const compNameStr = companyCode ? `${companyName}#${companyCode}` : companyName;
  
  console.log(`\n--- Simulating for ${companyName} (${companyId}) ---`);
  
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
          name: 'Test Worker',
          phone: `010-0000-${Math.floor(Math.random() * 10000)}`.padEnd(13, '0'),
          role: 'worker',
          company_name: compNameStr
      }
  });

  if (authError) {
      console.log('FAIL Auth:', authError.message);
      return;
  }
  
  const userId = authData.user.id;
  console.log('Auth user created:', userId);

  const { error: userError } = await adminClient
      .from('users')
      .upsert({
          id: userId,
          name: 'Test Worker',
          phone: `010-0000-${Math.floor(Math.random() * 10000)}`.padEnd(13, '0'),
          email: email,
          role: 'worker',
          worker_type: 'member',
          account_info: '',
          company_id: companyId,
          status: 'active',
          initial_password: 'password123'
      });

  if (userError) {
      console.log('FAIL Upsert:', userError);
  } else {
      console.log('SUCCESS Upsert');
  }
  
  // Clean up
  await adminClient.from('users').delete().eq('id', userId);
  await adminClient.auth.admin.deleteUser(userId);
}

async function main() {
  // Try one working, one failing? '더클린' vs 'NEXUS 시스템'
  await simulateCreateWorker("e1df32eb-a77c-45e9-aef8-4bf4c9767e41", "더클린", "7819");
  await simulateCreateWorker("00245fd6-961c-4c0f-a10b-2ad123cdd61c", "NEXUS 시스템", "MSTR");
}

main();
