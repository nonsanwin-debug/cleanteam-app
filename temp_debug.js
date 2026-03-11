const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

const lines = envFile.split(/\r?\n/);
for (const line of lines) {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
    }
    if (line.trim().startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        supabaseKey = line.split('=')[1].trim().replace(/^"|"$/g, '');
    }
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    // 1. Check company "더클린" code
    const { data: companies, error: cErr } = await supabase
        .from('companies')
        .select('*');
    
    console.log('--- Companies ---');
    console.log(companies?.map(c => `${c.name}#${c.code}`).join(', '));

    // For policies, I will write a simple sql query and use the temp_apply_schema method
    // to run it if necessary, but first let's just see if "더클린" #6382 exists.
}

run();
