const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
    const targetDate = new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const { data, error } = await supabase
        .from('sites')
        .select('id, name, address, created_at, cleaning_date')
        .or(`cleaning_date.gte.${startOfDay.toISOString()},and(cleaning_date.is.null,created_at.gte.${startOfDay.toISOString()})`);
        
    if (error) console.error(error);
    else {
        const filtered = data.filter(s => {
            const d = new Date(s.cleaning_date || s.created_at);
            return d >= startOfDay && d <= endOfDay;
        });
        for (const s of filtered) console.log(s.name, s.address);
    }
}
test();
