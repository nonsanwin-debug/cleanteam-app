const { readFileSync } = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

const c = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    // 1. Fetch ALL completed/in_progress sites
    const { data: sites } = await c
        .from('sites')
        .select('id, name, address, status, cleaning_date, companies:company_id(name)')
        .in('status', ['completed', 'in_progress'])
        .limit(200);

    console.log(`총 현장 수: ${sites.length}`);

    // 2. Get ALL site ids
    const ids = sites.map(s => s.id);
    
    // 3. Get photos in chunks (Supabase .in() limit)
    let allPhotos = [];
    for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const { data: photos } = await c
            .from('photos')
            .select('site_id, type')
            .in('site_id', chunk)
            .in('type', ['before', 'after']);
        if (photos) allPhotos = allPhotos.concat(photos);
    }

    // 4. Count photos per site
    const photoCount = {};
    allPhotos.forEach(p => {
        if (!photoCount[p.site_id]) photoCount[p.site_id] = { before: 0, after: 0 };
        photoCount[p.site_id][p.type]++;
    });

    // 5. Filter sites with both before & after photos
    const validSites = sites.filter(s => {
        const pc = photoCount[s.id];
        return pc && pc.before >= 1 && pc.after >= 1;
    });

    // 6. Sort by cleaning_date DESC
    validSites.sort((a, b) => {
        const da = a.cleaning_date || '0000-00-00';
        const db = b.cleaning_date || '0000-00-00';
        return db.localeCompare(da);
    });

    console.log(`사진 있는 현장: ${validSites.length}건`);
    console.log('\n=== 최신순 정렬 결과 ===');
    validSites.forEach(s => {
        const cn = Array.isArray(s.companies) ? s.companies[0]?.name : s.companies?.name;
        const pc = photoCount[s.id];
        console.log(`${s.cleaning_date} | B:${pc.before} A:${pc.after} | ${cn} | ${s.address}`);
    });
})();
