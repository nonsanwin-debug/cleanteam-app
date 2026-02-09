const https = require('https');

// Config from .env.local
// I'll grab these from the shell environment in the next step or hardcode them if I had them, but I'll use the env var approach again.
// For now, I'll rely on the shell to pass them.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_ID = '2121e233-9ff1-4580-9b18-5bd239d1d374'; // The ID that works

console.log(`Testing Worker Join for Site ID: ${SITE_ID}`);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing ENV variables');
    process.exit(1);
}

const options = {
    hostname: SUPABASE_URL.replace('https://', ''),
    path: `/rest/v1/sites?id=eq.${SITE_ID}&select=*,worker:users(name)`,
    method: 'GET',
    headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
    });
});

req.on('error', error => { console.error('Error:', error); });
req.end();
