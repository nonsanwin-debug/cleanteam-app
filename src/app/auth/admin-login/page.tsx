/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ShieldAlert } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function AdminLoginPage() {
    const [isMounted, setIsMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [keepLoggedIn, setKeepLoggedIn] = useState(true)
    const router = useRouter()

    // Initialize Supabase client only on the client side
    const supabase = useMemo<SupabaseClient | null>(() => {
        if (typeof window === 'undefined') return null
        try {
            return createClient(keepLoggedIn)
        } catch (error) {
            console.error('Failed to create Supabase client:', error)
            return null
        }
    }, [keepLoggedIn])

    useEffect(() => {
        setIsMounted(true)
        if (!supabase) {
            toast.error('초기화 오류', {
                description: 'Supabase 연결에 실패했습니다. 환경 변수를 확인해주세요.'
            })
        }
    }, [supabase])

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
        // 아이디 정규화 (소문자 및 공백 제거)
        const normalizedUsername = username.trim().toLowerCase()
        const email = `${normalizedUsername}@cleanteam.temp`

        try {
            console.log('🔐 관리자 로그인 시도:', { username: normalizedUsername, email });

            const { data: signInData, error } = await supabase.auth.signInWithPassword({
                email,
                password: password.trim(), // password trim 추가
            })

            if (error) {
                console.error('❌ 로그인 에러:', error);
                throw error;
            }

            console.log('✅ 로그인 성공:', signInData.user?.email);

            // Check user role
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                let { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (!profile) {
                    // Fallback create profile if missing (Admin Auto-Create is risky but keeping logic consistent)
                    const roleToSet = user.user_metadata.role || 'worker' // Default to worker if unknown
                    const nameToSet = user.user_metadata.name || '사용자'

                    if (roleToSet === 'admin') {
                        await supabase.from('users').insert([{ id: user.id, name: nameToSet, role: 'admin' }])
                        profile = { role: 'admin' }
                    }
                }

                // Redirect based on role
                if (profile?.role === 'master') {
                    console.log('🌟 마스터로 리다이렉트');
                    toast.success('마스터 로그인 성공')
                    router.refresh()
                    router.push('/master/dashboard')
                } else if (profile?.role === 'admin') {
                    console.log('👑 관리자로 리다이렉트');
                    toast.success('관리자 로그인 성공')
                    router.refresh()
                    router.push('/admin/dashboard')
                } else {
                    console.log('❌ 권한 부족 - worker가 admin 페이지 접근 시도');
                    toast.error('로그인 실패: 권한 부족', {
                        description: '이 계정은 관리자 권한이 없습니다.'
                    })
                    await supabase.auth.signOut() // Force sign out
                }
            }
        } catch (err: any) {
            console.error('🚨 인증 오류:', err);
            let errorMessage = err.message;
            if (err.message?.includes('Invalid login credentials')) {
                errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
            }
            toast.error('로그인 실패', { description: errorMessage })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 border-t-8 border-red-600">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto flex justify-center items-center mb-2">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[48px] h-[48px]" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="admin-form-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#4F46E5" />
                                    <stop offset="100%" stopColor="#22D3EE" />
                                </linearGradient>
                                <linearGradient id="admin-form-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#22D3EE" />
                                    <stop offset="100%" stopColor="#10B981" />
                                </linearGradient>
                                <linearGradient id="admin-form-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset="100%" stopColor="#BEF264" />
                                </linearGradient>
                            </defs>
                            <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#admin-form-grad-1)" />
                            <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#admin-form-grad-3)" />
                            <path d="M5.25 4.75L18.75 19.25" stroke="url(#admin-form-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-800">NEXUS 관리자</CardTitle>
                        <CardDescription>
                            접근 권한이 있는 관리자만 로그인할 수 있습니다.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username-admin">관리자 아이디</Label>
                            <Input id="username-admin" name="username" type="text" placeholder="admin" required className="border-slate-300" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password-admin">비밀번호</Label>
                            <Input id="password-admin" name="password" type="password" required className="border-slate-300" />
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-1 pb-2">
                            <input 
                                type="checkbox" 
                                id="keepLoggedInAdmin" 
                                checked={keepLoggedIn}
                                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-600"
                            />
                            <Label htmlFor="keepLoggedInAdmin" className="text-sm font-medium text-slate-700 cursor-pointer">
                                로그인 상태 유지
                            </Label>
                        </div>
                        
                        <Button type="submit" variant="destructive" className="w-full py-6 text-lg" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '관리자 로그인'}
                        </Button>
                        <div className="text-center text-sm pt-2">
                            <span className="text-slate-500">아직 계정이 없으신가요? </span>
                            <button type="button" onClick={() => router.push('/auth/admin-register')} className="font-medium text-indigo-600 hover:text-indigo-500">
                                업체 등록 및 회원가입
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
