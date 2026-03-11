const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    try {
        const sql = fs.readFileSync('create_admin_memos_table.sql', 'utf8');
        console.log('Executing SQL...');
        
        // Try the exec_sql RPC
        const { error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
            console.log('exec_sql failed, trying exec statement by statement...');
            // Try individual statements
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i] + ';';
                const { error: execError } = await supabase.rpc('exec', { sql: statement });
                if (execError) {
                    console.error(`Error in statement ${i + 1}:`, execError.message);
                } else {
                    console.log(`Success statement ${i + 1}`);
                }
            }
        } else {
            console.log('Successfully applied via exec_sql');
        }
    } catch (err) {
        console.error('Error applying sql:', err);
    }
}

run();
