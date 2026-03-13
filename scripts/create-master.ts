import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMasterUser() {
  const email = 'nexusadmin@cleanteam.temp';
  const password = 'winwinwinwin';

  console.log('1. Adding "master" to role check constraint...');
  
  // Actually we need to run SQL for the constraint. First let's create the user.
  console.log('2. Creating user in auth.users...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: '최고관리자',
      role: 'master',
      company_name: 'NEXUS 시스템'
    }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
        console.log('User already exists in auth.users, trying to find and update...');
    } else {
        console.error('Failed to create auth user:', authError);
        return;
    }
  }

  // Get the user ID (either newly created or search for existing)
  const id = authData?.user?.id;
  if (!id) {
     const {data: users} = await supabase.auth.admin.listUsers();
     const existingUser = users.users.find(u => u.email === email);
     if (existingUser) {
         console.log('Found existing auth user:', existingUser.id);
         await updatePublicUser(existingUser.id);
     } else {
         console.error('Could not find user after registration failed');
     }
     return;
  }
  
  console.log('Successfully created auth user:', id);
  // NOTE: trigger might fail if 'master' is not in constraint yet, so we will update it or run SQL first.
}

async function updatePublicUser(id: string) {
    console.log('Updating public.users...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'master', name: '최고관리자' })
      .eq('id', id);
      
    if (updateError) {
        console.error('Update public.users failed:', updateError);
    } else {
        console.log('Successfully updated public.users to master role');
    }
}

createMasterUser();
