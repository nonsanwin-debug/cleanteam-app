import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session) {
      const user = session.user
      
      // Check if profile is complete in public.users
      const { data: profile } = await supabase
        .from('users')
        .select('company_id, role, phone, bank_name')
        .eq('id', user.id)
        .single()
      
      // If essential information is missing, it's a new Kakao signup
      if (!profile?.company_id || !profile?.phone || !profile?.role) {
         return NextResponse.redirect(new URL('/auth/complete-profile', request.url))
      }
      
      // Otherwise, log them into their dashboard
      if (profile.role === 'admin') {
         return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else if (profile.role === 'master') {
         return NextResponse.redirect(new URL('/master/dashboard', request.url))
      } else {
         return NextResponse.redirect(new URL('/worker/home', request.url))
      }
    }
  }

  // URL to redirect to after sign in if error occurs or no code
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
