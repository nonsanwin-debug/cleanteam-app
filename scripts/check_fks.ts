import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function restoreWorker() {
    console.log("Fetching auth user to restore profile")
    const { data: { user }, error } = await supabase.auth.admin.getUserById('00d181b3-876f-45ea-948c-bdf58e2e07bb')
    if (user) {
        console.log("Restoring profile for", user.user_metadata)
        await supabase.from('users').insert({
            id: user.id,
            name: user.user_metadata.name || '외 2명',
            phone: user.user_metadata.phone,
            role: 'worker',
            status: 'active'
        })
        console.log("Restored!")
    } else {
        console.log("User not found or error", error)
    }
}
restoreWorker()
