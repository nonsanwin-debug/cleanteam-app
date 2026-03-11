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
    const { data, error } = await supabase.from('admin_memos').select('*').limit(1);
    console.log('--- admin_memos check ---');
    console.log('Result:', data);
    if (error) {
        console.error('Error:', error);
    }
}

run();
