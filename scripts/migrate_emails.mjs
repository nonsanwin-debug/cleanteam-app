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
    console.log("Fetching all users to find .local legacy admins...");
    let allUsers = [];
    let page = 1;

    // Fetch up to 5000 users just in case
    while (true) {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers({
            page,
            perPage: 1000
        });
        
        if (error) {
            console.error("Error fetching users:", error);
            break;
        }
        
        allUsers = allUsers.concat(users);
        if (users.length < 1000) break;
        page++;
    }

    const legacyAdmins = allUsers.filter(u => u.email?.endsWith('@cleanteam.local'));
    console.log(`Found ${legacyAdmins.length} legacy admins to migrate.`);
    
    let successCount = 0;
    for (const admin of legacyAdmins) {
        const newEmail = admin.email.replace('@cleanteam.local', '@cleanteam.temp');
        console.log(`Migrating ${admin.email} -> ${newEmail} ...`);
        
        const { error } = await adminClient.auth.admin.updateUserById(admin.id, {
            email: newEmail,
            email_confirm: true // bypass confirm email requirement
        });
        
        if (error) {
            console.error(`Failed to migrate ${admin.id}:`, error.message);
        } else {
            // Also need to update the public.users table if email is stored there
            await adminClient
                .from('users')
                .update({ email: newEmail })
                .eq('id', admin.id);
                
            successCount++;
        }
    }
    console.log(`Migration complete. Successfully updated ${successCount}/${legacyAdmins.length} users.`);
}

main();
