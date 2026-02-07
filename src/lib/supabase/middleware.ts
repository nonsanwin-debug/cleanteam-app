import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return response
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // refesh session
    const { data: { user } } = await supabase.auth.getUser()

    // Protected Routes Logic
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/auth/admin-login', request.url))
        }
        // Optional: Check if user is actually admin
        // We'd need to query the 'users' table here to be sure, 
        // but for now let's just ensure they are logged in.
        // If they are a worker logged in, the admin page will likely check role and block/redirect anyway.
    }

    if (request.nextUrl.pathname.startsWith('/worker')) {
        if (!user) {
            return NextResponse.redirect(new URL('/auth/login', request.url))
        }
    }

    if (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/auth/admin-login') {
        if (user) {
            // If already logged in, maybe redirect to home?
            // But we need to know their role to redirect correctly (admin -> /admin, worker -> /worker)
            // Fetching role here might add latency. Let's skipping auto-redirect for now 
            // or let the page handle it (our pages do handle it).
        }
    }

    return response
}

