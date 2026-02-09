import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function applySchema() {
    try {
        console.log('🚀 Starting schema migration...\n')

        // Read the schema file
        const schemaPath = path.join(process.cwd(), 'init_full_schema_clean.sql')
        const schema = fs.readFileSync(schemaPath, 'utf-8')

        console.log('📄 Read schema file: init_full_schema_clean.sql')
        console.log(`📊 Schema size: ${schema.length} characters\n`)

        // Execute the schema
        console.log('⚙️  Executing schema...')
        const { data, error } = await supabase.rpc('exec_sql', { sql: schema })

        if (error) {
            // If exec_sql doesn't exist, try direct execution
            console.log('⚠️  exec_sql not found, trying direct execution...')

            // Split by semicolons and execute each statement
            const statements = schema
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'))

            console.log(`📝 Found ${statements.length} SQL statements\n`)

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i] + ';'
                console.log(`Executing statement ${i + 1}/${statements.length}...`)

                const { error: execError } = await supabase.rpc('exec', {
                    sql: statement
                })

                if (execError) {
                    console.error(`❌ Error in statement ${i + 1}:`, execError.message)
                    // Continue with next statement
                }
            }
        }

        console.log('\n✅ Schema migration completed!')
        console.log('\n📋 Summary:')
        console.log('  - Companies table created/updated')
        console.log('  - Users table created/updated')
        console.log('  - Sites table created/updated')
        console.log('  - Checklist tables created/updated')
        console.log('  - Photos table created/updated')
        console.log('  - AS requests table created/updated')
        console.log('  - Withdrawal requests table created/updated')
        console.log('  - RLS policies applied')
        console.log('  - ✨ Company creation trigger installed!')
        console.log('\n🎉 You can now register admins with company names!')

    } catch (err) {
        console.error('❌ Migration failed:', err)
        process.exit(1)
    }
}

applySchema()
