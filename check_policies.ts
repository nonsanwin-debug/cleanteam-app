import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.rpc('get_policies');
    // If rpc fails, we query pg_policies using sql
    const res = await supabase.from('pg_policies').select('*').eq('tablename', 'sites');
    console.log(res);
}

check();
