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
import { Checkbox } from '@/components/ui/checkbox'
import { TermsDialog } from '@/components/auth/terms-dialog'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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

  async function handleKakaoLogin() {
    if (!supabase) return
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Kakao login error:', err)
      toast.error('로그인 실패', { description: '카카오 로그인 중 오류가 발생했습니다.' })
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
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900 flex items-center justify-center gap-2 md:justify-start mb-2">
                <svg viewBox="0 0 24 24" fill="none" className="w-[40px] h-[40px] flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="header-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#4F46E5" />
                            <stop offset="100%" stopColor="#22D3EE" />
                        </linearGradient>
                        <linearGradient id="header-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22D3EE" />
                            <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <linearGradient id="header-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#10B981" />
                            <stop offset="100%" stopColor="#BEF264" />
                        </linearGradient>
                    </defs>
                    <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#header-grad-1)" />
                    <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#header-grad-3)" />
                    <path d="M5.25 4.75L18.75 19.25" stroke="url(#header-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                </svg>
                <span className="font-black text-[#0F172A] tracking-tighter pt-1.5">NEXUS</span>
            </h1>
            <p className="text-xl text-slate-500">
              청소 현장 관리 시스템 & 스마트 검수 솔루션
            </p>
          </div>

          <div className="flex flex-col gap-6 pt-6 max-w-[320px] mx-auto md:mx-0">
            <div className="flex items-center gap-4 text-left">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-slate-700 text-[16px]">표준화된 체크리스트</h3>
                <p className="text-[14px] text-slate-500 mt-1">매뉴얼화된 청소 기준으로 품질 보장</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-6 h-6 rounded bg-[#FBE54E] flex items-center justify-center text-slate-800 font-bold text-[10px] flex-shrink-0">MAP</div>
              <div>
                <h3 className="font-bold text-slate-700 text-[16px]">작업 현장 간 예상거리 제공</h3>
                <p className="text-[14px] text-slate-500 mt-1">정확한 현장 도착 시간과 위치 기록</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-[10px] flex-shrink-0">IMG</div>
              <div>
                <h3 className="font-bold text-slate-700 text-[16px]">사진 검수 시스템</h3>
                <p className="text-[14px] text-slate-500 mt-1">작업 전/중/후 사진 실시간 공유</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full max-w-md mx-auto md:mx-0">
          <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-600">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <svg viewBox="0 0 24 24" fill="none" className="w-[40px] h-[40px]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="form-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#4F46E5" />
                            <stop offset="100%" stopColor="#22D3EE" />
                        </linearGradient>
                        <linearGradient id="form-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22D3EE" />
                            <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <linearGradient id="form-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#10B981" />
                            <stop offset="100%" stopColor="#BEF264" />
                        </linearGradient>
                    </defs>
                    <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#form-grad-1)" />
                    <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#form-grad-3)" />
                    <path d="M5.25 4.75L18.75 19.25" stroke="url(#form-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                </svg>
              </div>
              <CardTitle className="text-2xl">현장 팀장 로그인</CardTitle>
              <CardDescription>
                스마트폰으로 간편하게 시작하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-4 pb-2">
                <Button 
                  onClick={handleKakaoLogin}
                  className="w-full text-lg py-6 bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90 font-bold border border-[#FEE500]/20" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 3C6.477 3 2 6.551 2 10.932c0 2.825 1.83 5.305 4.542 6.64-.131.427-.428 1.403-.497 1.642-.086.299.103.292.215.218.087-.058 1.385-.922 1.954-1.3l.067-.044c1.192.27 2.441.413 3.719.413 5.523 0 10-3.55 10-7.931s-4.477-7.932-10-7.932z"/>
                    </svg>
                  )}
                  카카오 로그인 / 회원가입
                </Button>
                <p className="text-xs text-center text-slate-500 mt-4">
                  아이디와 비밀번호 없이 1초만에 시작하세요.
                </p>
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
