import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmrhxvtcvcbcnaeonvsd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tcmh4dnRjdmNiY25hZW9udnNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYyNDUwMSwiZXhwIjoyMDg2MjAwNTAxfQ.HbdQTBO4tNh_Fg2FPOE2oOuJ8grfS6opUi87RN9_hvY';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, code, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching companies:', error);
    return;
  }
  
  fs.writeFileSync('scripts/companies.json', JSON.stringify(companies, null, 2));
  console.log('Saved to scripts/companies.json');
}

main();
