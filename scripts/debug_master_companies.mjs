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
    console.log("Fetching companies without deleted status...");
    
    const { data: companies, error } = await adminClient
        .from('companies')
        .select(`
            *,
            owner:users!companies_owner_id_fkey(name, email, phone)
        `)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

    console.log("Error:", error);
    console.log("Count:", companies?.length);
    if (companies && companies.length > 0) {
        console.log("First company status:", companies[0].status);
    }
}

main();
