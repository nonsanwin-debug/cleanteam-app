/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, HardHat, Eye, EyeOff } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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

        // DB에서 업체 확인
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, code')
          .eq('name', inputName.trim())
          .eq('code', inputCode.trim())
          .single()

        if (!companyData) {
          toast.error('없는 소속입니다', { description: '업체명과 코드를 다시 확인해주세요. 관리자에게 문의하세요.' })
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 text-center flex flex-col md:flex-row md:items-start md:text-left gap-12">

        {/* Left Side: Intro Text */}
        <div className="flex-1 space-y-6 pt-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900">
              청소 현장 관리 시스템
            </h1>
            <p className="text-xl text-slate-500">
              현장 작업 표준화 및 스마트 검수 솔루션
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 text-slate-600 pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">표준화된 체크리스트</h3>
                <p className="text-sm">매뉴얼화된 청소 기준으로 품질 보장</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">GPS</div>
              <div>
                <h3 className="font-semibold">위치 기반 출석</h3>
                <p className="text-sm">정확한 현장 도착 시간과 위치 기록</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs flex-shrink-0">IMG</div>
              <div>
                <h3 className="font-semibold">사진 검수 시스템</h3>
                <p className="text-sm">작업 전/중/후 사진 실시간 공유</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full max-w-md mx-auto md:mx-0">
          <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-600">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <HardHat className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">현장 팀장 로그인</CardTitle>
              <CardDescription>
                {isSignUp ? '새 계정 만들기' : '작업 시작, 사진 촬영, 체크리스트 제출'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">이름</Label>
                      <Input id="name" name="name" placeholder="홍길동" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">소속 (업체명#코드)</Label>
                      <Input id="companyName" name="companyName" placeholder="예: 클린프로#1234" required />
                      <p className="text-xs text-slate-500">* 관리자에게 확인한 업체명과 코드를 정확히 입력해주세요.</p>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">아이디</Label>
                  <Input id="username" name="username" type="text" placeholder="teamleader01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSignUp ? '팀장 등록하기' : '로그인')}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-slate-500 hover:text-blue-600 underline block w-full"
                >
                  {isSignUp ? '이미 계정이 있으신가요? 로그인' : '현장 팀장 계정이 없으신가요? 회원가입'}
                </button>
              </div>
            </CardContent>
          </Card>
          <div className="text-center mt-4">
            <Link href="/auth/admin-login" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
              관리자 페이지로 이동
            </Link>
          </div>
        </div>

      </div>

      <footer className="mt-12 text-sm text-slate-400 text-center">
        © 2026 Field Management System. All rights reserved.
      </footer>
    </div>
  )
}
