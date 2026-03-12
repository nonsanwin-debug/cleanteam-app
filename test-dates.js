const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    console.log('Fetching all sites...');
    const { data: allData } = await supabase.from('sites').select('id, name, cleaning_date, created_at, address');
    console.log('Total sites in DB:', allData.length);
    
    // KST 기준으로 오늘 하루를 구해야 함
    // targetDate = 2026-03-12
    const targetDate = new Date();
    // Vercel / Node.js 가 UTC로 돌아가고 있을 수 있으므로 startOfDay/endOfDay 계산에 주의
    
    // 강제로 현재 KST (UTC+9) 날짜를 기준 삼음
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // console.log("Filtering for KST today: ", startOfDay.toISOString(), "~", endOfDay.toISOString());
    
    const countToday = allData.filter(s => {
        const d = new Date(s.cleaning_date || s.created_at);
        return d >= startOfDay && d <= endOfDay;
    });
    
    console.log('Sites matching today:', countToday.length);
    for (let s of countToday) {
        console.log(`- ${s.name} [${s.cleaning_date}] (${s.address})`);
    }
}
test();
