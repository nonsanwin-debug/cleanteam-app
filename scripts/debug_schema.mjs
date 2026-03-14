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
    // Just select companies without joining to see if that works
    console.log("Fetching just companies...");
    const { data: c, error: cErr } = await adminClient.from('companies').select('*').limit(1);
    console.log("Companies:", c ? "OK" : cErr.message);

    if (c && c.length > 0) {
        console.log("Company keys:", Object.keys(c[0]));
    }
}
main();
