/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, HardHat, Eye, EyeOff } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { TermsDialog } from '@/components/auth/terms-dialog'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const router = useRouter()

  // Initialize Supabase client only on the client side
  const supabase = useMemo<SupabaseClient | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return createClient()
    } catch (error) {
      console.error('Failed to create Supabase client:', error)
      return null
    }
  }, [])

  useEffect(() => {
    setIsMounted(true)
    if (!supabase) {
      toast.error('초기화 오류', {
        description: 'Supabase 연결에 실패했습니다. 환경 변수를 확인해주세요.'
      })
    }
  }, [supabase])

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!supabase) {
      toast.error('연결 오류', { description: 'Supabase 클라이언트가 초기화되지 않았습니다.' })
      return
    }

    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string // Only for signup
    const companyName = formData.get('companyName') as string // Only for signup
    const role = 'worker' // Always worker here for main page

    // 아이디를 이메일 형식으로 변환 (최신 도메인: .temp, 대소문자 & 공백 무시)
    const email = `${username.trim().toLowerCase()}@cleanteam.temp`

    try {
      if (isSignUp) {
        // 소속 코드 검증
        if (!companyName || !companyName.includes('#')) {
          toast.error('소속 형식 오류', { description: '업체명#코드 형식으로 입력해주세요. (예: 클린프로#1234)' })
          setIsLoading(false)
          return
        }

        const [inputName, inputCode] = companyName.split('#')
        if (!inputName || !inputCode) {
          toast.error('소속 형식 오류', { description: '업체명과 코드를 모두 입력해주세요.' })
          setIsLoading(false)
          return
        }

        if (!agreedToTerms) {
          toast.error('가입 실패', { description: 'NEXUS 서비스 이용약관에 동의해야 합니다.' })
          setIsLoading(false)
          return
        }

        // DB에서 업체 확인 (서버 액션 사용 - RLS 우회)
        const { verifyCompany } = await import('@/actions/auth-actions')
        const companyRes = await verifyCompany(inputName, inputCode)

        if (!companyRes.success) {
          toast.error('없는 소속입니다', { description: companyRes.error })
          setIsLoading(false)
          return
        }


        // SIGN UP LOGIC
        const { data, error } = await supabase.auth.signUp({
          email,
          password: password.trim(),
          options: {
            data: {
              name: name || '현장팀장',
              role: 'worker',
              username: username,
              company_name: companyName
            }
          }
        })

        if (error) throw error;

        if (data.user) {
          let { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single()

          if (!profile) {
            const nameToSet = data.user.user_metadata.name || '사용자'
            const { error: insertError } = await supabase
              .from('users')
              .insert([{ id: data.user.id, name: nameToSet, role: 'worker' }])

            if (!insertError) profile = { role: 'worker' }
          }

          toast.success('회원가입 완료!', { description: '로그인되었습니다.' })
          router.push('/worker/home')
        }
      } else {
        // SIGN IN LOGIC (Robust integrated version)
        console.log('🔐 메인 로그인 시도:', { username, email });

        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password: password.trim(),
        })

        if (error) {
          console.error('❌ 메인 로그인 에러:', error);
          throw error;
        }

        console.log('✅ 메인 로그인 성공:', signInData.user?.email);

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          let { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

          if (!profile) {
            const nameToSet = user.user_metadata.name || '사용자'
            await supabase.from('users').insert([{ id: user.id, name: nameToSet, role: 'worker' }])
            profile = { role: 'worker' }
          }

          toast.success('로그인 성공')
          if (profile?.role === 'admin') {
            window.location.href = '/admin/dashboard'
          } else {
            window.location.href = '/worker/home'
          }
        }
      }
    } catch (err: any) {
      console.error('🚨 인증 오류:', err);
      let errorMessage = err.message;
      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
      }
      toast.error(isSignUp ? '가입 실패' : '로그인 실패', { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading...</div>
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">연결 오류</CardTitle>
            <CardDescription>
              Supabase 연결에 실패했습니다. 관리자에게 문의하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="text-center pt-10 pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              NEXUS
            </h1>
            <CardDescription className="text-slate-500 font-medium">
              {isSignUp ? '현장 팀장 계정 생성' : '현장 팀장 로그인 (System v3 Updated)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 px-8">
            <form onSubmit={handleAuth} className="space-y-6">
              {isSignUp && (
                <>
                  <div className="space-y-2 text-left">
                    <Label htmlFor="name" className="font-bold text-slate-800 text-sm">이름</Label>
                    <Input id="name" name="name" placeholder="홍길동" required className="bg-slate-50/50 py-6 placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label htmlFor="companyName" className="font-bold text-slate-800 text-sm">소속 (업체명#코드)</Label>
                    <Input id="companyName" name="companyName" placeholder="예: 클린프로#1234" required className="bg-slate-50/50 py-6 placeholder:text-slate-400" />
                    <p className="text-xs text-slate-500">* 관리자에게 확인한 업체명과 코드를 정확히 입력해주세요.</p>
                  </div>
                </>
              )}
              <div className="space-y-2 text-left">
                <Label htmlFor="username" className="font-bold text-slate-800 text-sm">아이디</Label>
                <Input 
                  id="username" 
                  name="username" 
                  type="text" 
                  placeholder="아이디를 입력하세요 (예: team8594)" 
                  required 
                  className="bg-slate-50/50 py-6 placeholder:text-slate-400 focus-visible:ring-slate-900" 
                />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password" className="font-bold text-slate-800 text-sm">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    required
                    className="bg-slate-50/50 py-6 pr-10 placeholder:text-slate-400 focus-visible:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {isSignUp && (
                <div className="flex items-start space-x-2 pt-1 pb-1">
                  <Checkbox 
                    id="terms-worker" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} 
                    className="mt-1"
                  />
                  <label
                    htmlFor="terms-worker"
                    className="text-sm font-medium leading-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 text-left"
                  >
                    <button type="button" onClick={() => setIsTermsOpen(true)} className="text-[#1a1a1a] underline underline-offset-2 hover:text-black font-bold mx-1">
                      NEXUS 서비스 이용약관
                    </button>
                    에 동의합니다.
                  </label>
                </div>
              )}

              <Button type="submit" className="w-full text-base font-semibold py-6 bg-[#1a1a1a] hover:bg-black text-white mt-4 transition-colors" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSignUp ? '팀장 등록하기' : '현장 팀장 로그인')}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[13px] text-slate-500 hover:text-slate-800 underline underline-offset-4 font-medium transition-colors"
              >
                {isSignUp ? '이미 계정이 있으신가요? 로그인' : '현장 팀장 계정이 없으신가요? 회원가입'}
              </button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
           <Link href="/auth/admin-login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium">
             관리자 전용 로그인
           </Link>
        </div>
      </div>
      <TermsDialog open={isTermsOpen} onOpenChange={setIsTermsOpen} />
    </div>
  )
}
