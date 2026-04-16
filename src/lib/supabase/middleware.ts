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

    const hostname = request.headers.get('host') || ''

    // 파트너 전용 도메인 접속 처리
    if (hostname.includes('nexuspartner.kr') && request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL('/field/home', request.url))
    }

    // 고객 문의 전용 도메인 접속 처리 (clean.me.kr 로 들어오면 /book 페이지를 띄움)
    if (hostname.includes('clean.me.kr')) {
        if (request.nextUrl.pathname === '/') {
            return NextResponse.rewrite(new URL('/book', request.url))
        }
        if (request.nextUrl.pathname === '/manifest.json') {
            // 설치 알림 방지를 위해 manifest 파일을 강제로 404 처리
            return new NextResponse(null, { status: 404 })
        }
    }

    // QR코드 인쇄 오류 대응: nexus.닷컴 접속 시 nexuspartner.kr 로 자동 리다이렉트
    if (hostname.includes('nexus.xn--mk1bu44c') && request.nextUrl.pathname.includes('/auth/partner-login')) {
        return NextResponse.redirect('https://nexuspartner.kr/auth/partner-login')
    }

    // Protected Routes Logic
    if (request.nextUrl.pathname.startsWith('/master')) {
        if (!user) {
            return NextResponse.redirect(new URL('/auth/admin-login', request.url))
        }
    }

    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/auth/admin-login', request.url))
        }
    }

    if (request.nextUrl.pathname.startsWith('/worker')) {
        if (!user) {
            return NextResponse.redirect(new URL('/auth/login', request.url))
        }
    }

    if (request.nextUrl.pathname.startsWith('/field')) {
        const publicPaths = ['/field/home', '/field/notices']
        const isPublic = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))
        if (!user && !isPublic) {
            return NextResponse.redirect(new URL('/auth/partner-login', request.url))
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

