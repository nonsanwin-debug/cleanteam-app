const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('companies')
    .select(`
        *,
        owner:users(name, email, phone)
    `);
    
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS, count:', data?.length);
  }
}

test();
