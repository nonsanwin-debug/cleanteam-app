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
    // Find admins and companies created today
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // We update all companies with status = 'approved' that haven't actually been verified to pending?
    // Let's just update all admins with status 'active' created today to 'pending' as a cleanup
    const { data: recentAdmins, error } = await adminClient
        .from('users')
        .update({ status: 'pending' })
        .eq('role', 'admin')
        .eq('status', 'active')
        .gte('created_at', today.toISOString())
        .select('id, name, company_id');
        
    console.log(`Reset ${recentAdmins?.length || 0} recent admins to pending.`);
    
    if (recentAdmins && recentAdmins.length > 0) {
        for (const admin of recentAdmins) {
            if (admin.company_id) {
                await adminClient
                    .from('companies')
                    .update({ status: 'pending' })
                    .eq('id', admin.company_id)
                    .eq('status', 'approved');
            }
        }
        console.log("Reset their respective companies to pending too.");
    }
}

main();
