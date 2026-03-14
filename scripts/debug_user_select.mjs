import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
    const userId = "5cf8e383-589c-43f1-9b1d-c5c56c700140"; // 김프로1
    
    const { data: user, error } = await adminClient
        .from('users')
        .select('*')
        .eq('id', userId);
        
    console.log("SELECT:", user);
    
    // Check if Upsert works
    if (user && user.length === 0) {
        console.log("Row does not exist! Running Upsert...");
        const companyId = "6ef68faa-8709-4788-b4b1-91ae4e803d35"; // from previous debug
        const { data: upsertData, error: upsertErr } = await adminClient
            .from('users')
            .upsert({ 
                id: userId,
                company_id: companyId,
                name: "김프로1 업서트",
                role: 'admin',
                status: 'active'
            })
            .select();
        console.log("UPSERT RESULT:", upsertData, upsertErr);
    }
}
main();
