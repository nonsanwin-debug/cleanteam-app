const https = require('https');

// Config from .env (I will need to ensure these are correct, assuming standard Vercel setup)
// Since I can't read the Vercel ENV directly, I'll rely on the local .env.local 
// OR I will ask the user. But I have the local env.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zfaagizkdixopldhqixv.supabase.co'; // Fallback to what I saw in logs
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING';

// The ID user provided
const SITE_ID = '2121e233-9ff1-4580-9b18-5bd239d1d374';

console.log(`Testing Public Access for Site ID: ${SITE_ID}`);
console.log(`URL: ${SUPABASE_URL}`);

const options = {
    hostname: SUPABASE_URL.replace('https://', ''),
    path: `/rest/v1/sites?id=eq.${SITE_ID}&select=*`,
    method: 'GET',
    headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, res => {
    let data = '';
    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', chunk => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('--- BODY START ---');
        console.log(data);
        console.log('--- BODY END ---');
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json) && json.length > 0) {
                console.log("SUCCESS: Site found anonymously. ID:", json[0].id);
            } else {
                console.log("FAILURE: Site not found or empty response. JSON:", JSON.stringify(json));
            }
        } catch (e) {
            console.log("Error parsing JSON:", e);
        }
    });
});

req.on('error', error => {
    console.error('Request Error:', error);
});

req.end();
