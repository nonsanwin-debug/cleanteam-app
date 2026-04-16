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
    // 모든 업체별 현장 상태 분포 확인
    const { data: allSites } = await c
        .from('sites')
        .select('status, companies:company_id(name)')
        .limit(500);

    const companyStats = {};
    allSites.forEach(s => {
        const cn = Array.isArray(s.companies) ? s.companies[0]?.name : s.companies?.name;
        const key = cn || '업체미지정';
        if (!companyStats[key]) companyStats[key] = { scheduled: 0, in_progress: 0, completed: 0 };
        companyStats[key][s.status]++;
    });

    console.log('=== 업체별 현장 상태 분포 ===');
    Object.entries(companyStats).forEach(([name, stats]) => {
        console.log(`${name}: 대기=${stats.scheduled} 진행=${stats.in_progress} 완료=${stats.completed}`);
    });
})();
