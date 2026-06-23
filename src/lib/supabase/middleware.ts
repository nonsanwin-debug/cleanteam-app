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

    // 1. 도메인 트레이드에 따른 교차 경로 리다이렉션 (사용자 혼선 방지)
    // admin/worker/일반 로그인 경로가 nexus.닷컴으로 들어왔을 때 -> nexuspartner.kr 로 전송
    if (hostname.includes('nexus.xn--mk1bu44c')) {
        const isAdminOrWorkerPath = 
            request.nextUrl.pathname.startsWith('/admin') || 
            request.nextUrl.pathname.startsWith('/master') || 
            request.nextUrl.pathname.startsWith('/worker') || 
            ['/auth/login', '/auth/register', '/auth/admin-login', '/auth/admin-register'].some(p => request.nextUrl.pathname.startsWith(p))
            
        if (isAdminOrWorkerPath) {
            return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://nexuspartner.kr'))
        }
    }

    // partner 전용 경로가 nexuspartner.kr로 들어왔을 때 -> nexus.닷컴으로 전송
    if (hostname.includes('nexuspartner.kr')) {
        const isPartnerPath = 
            request.nextUrl.pathname.startsWith('/field') || 
            ['/auth/partner-login', '/auth/partner-register'].some(p => request.nextUrl.pathname.startsWith(p))
            
        if (isPartnerPath) {
            return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://nexus.xn--mk1bu44c'))
        }
    }

    // 2. 파트너 전용 도메인(이제 nexus.닷컴) 접속 시 루트('/') -> '/field/home' 리다이렉트
    if (hostname.includes('nexus.xn--mk1bu44c') && request.nextUrl.pathname === '/') {
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

    // 3. QR코드 및 구형 링크 처리: nexuspartner.kr/auth/partner-login 진입 시 nexus.닷컴으로 리다이렉트
    if (hostname.includes('nexuspartner.kr') && request.nextUrl.pathname === '/auth/partner-login') {
        return NextResponse.redirect('https://nexus.xn--mk1bu44c/')
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

