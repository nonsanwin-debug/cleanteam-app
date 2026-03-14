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

async function main() {
    const companyName = "김프로1테스트업체";
    const code = "9999";
    const userId = "00000000-0000-0000-0000-000000000000"; // dummy

    const { data: compData, error: compError } = await adminClient
        .from('companies')
        .insert({
            name: companyName,
            code: code,
            company_code: code,
            owner_id: userId,
            status: 'approved'
        })
        .select()
        .single();
        
    if (compError) {
        console.error("EXPECTED ERROR:", compError);
    } else {
        console.log("SUCCESS:", compData);
    }
}
main();
