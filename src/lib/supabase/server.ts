import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

function log(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'server_client.log')
        fs.appendFileSync(logPath, new Date().toISOString() + ': ' + msg + '\n')
    } catch { } // ignore
}

export async function createClient() {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Log context
    const cookieNames = cookieStore.getAll().map(c => c.name).join(', ')
    log(`createClient called. Cookies: [${cookieNames}]`)

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase Environment Variables (Server)')
    }

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                    }
                },
            },
        }
    )
}
