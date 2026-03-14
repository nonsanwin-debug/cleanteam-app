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
    // Just try fetching without the explicit fkey name to let PostgREST find it
    console.log("Fetching companies with implicit foreign key...");
    
    const { data: companies, error } = await adminClient
        .from('companies')
        .select(`
            *,
            users:owner_id(name, email, phone)
        `)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

    console.log("Error:", error);
    if (!error) console.log("Success! Count:", companies?.length);
}

main();
