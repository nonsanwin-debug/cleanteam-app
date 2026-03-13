import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseSr = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetPassword() {
  console.log("Looking up nexusadmin...");
  const { data: users, error: selectErr } = await supabaseSr.auth.admin.listUsers();
  if (selectErr) {
    console.error("Error listing users:", selectErr);
    return;
  }
  
  const masterUser = users.users.find(u => u.email === 'nexusadmin@cleanteam.local');
  if (!masterUser) {
    console.error("nexusadmin user not found in auth.users!");
    return;
  }
  
  console.log(`Found nexusadmin (ID: ${masterUser.id}). Resetting password to 'winwinwinwin'...`);
  const { data, error } = await supabaseSr.auth.admin.updateUserById(masterUser.id, {
    password: 'winwinwinwin'
  });
  
  if (error) {
    console.error("Failed to reset password:", error);
  } else {
    console.log("Password reset successfully!", data.user.email);
  }
}

resetPassword();
