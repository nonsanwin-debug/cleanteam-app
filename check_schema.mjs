import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns_info', { table_name_param: 'sites' })
    if (error) {
        console.log("RPC Error, trying direct query if possible.", error);
    } else {
        console.log("Columns:", data);
    }
}
checkSchema()
