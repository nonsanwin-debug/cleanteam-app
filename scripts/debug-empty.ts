import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, role, company_id, companies(name, code, owner_id)')
      .eq('role', 'admin')
      .limit(10);
      
    if (error) {
      console.error("DB Error:", error);
      return;
    }
    
    console.log("=== ADMINS ===");
    users.forEach(u => {
      console.log(`- ${u.name} (company_id: ${u.company_id}) -> Company: ${u.companies?.name} (${u.companies?.code}) owner: ${u.companies?.owner_id}`);
    });
    
    const { data: noCompUsers } = await supabase
      .from('users')
      .select('count')
      .is('company_id', null)
      .eq('role', 'admin');
      
    console.log("Admins with NO company:", noCompUsers);
    
  } catch (err) {
    console.error("Script error:", err);
  }
}
run();
