const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function getColumns() {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    let url = '', key = '';
    envFile.split('\n').forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
    });

    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('companies').select('*').limit(1);

    if (error) {
        console.error(error);
    } else if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log("No data found, but request succeeded");
    }
}

getColumns();
