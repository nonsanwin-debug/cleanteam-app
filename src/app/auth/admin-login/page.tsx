/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function AdminLoginPage() {
    const [isMounted, setIsMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

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

    if (!isMounted) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-400">Loading...</div>
    }

    if (!supabase) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
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

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 border-t-8 border-red-600">
            <Card className="w-full max-w-md shadow-xl border-t-8 border-yellow-400">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto flex justify-center items-center mb-2">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[48px] h-[48px]" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="admin-form-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#4F46E5" />
                                    <stop offset="100%" stopColor="#22D3EE" />
                                </linearGradient>
                                <linearGradient id="admin-form-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset="100%" stopColor="#BEF264" />
                                </linearGradient>
                            </defs>
                            <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#admin-form-grad-1)" />
                            <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#admin-form-grad-3)" />
                        </svg>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-800">NEXUS 관리자</CardTitle>
                        <CardDescription>
                            제휴 업체 관리자 전용 엑세스입니다.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 pt-4">
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
                            카카오로 시작하기
                        </Button>
                        <p className="text-xs text-center text-slate-500 mt-4">
                            보안 강화 및 간편한 접근을 위해 소셜 로그인으로 통합되었습니다.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
