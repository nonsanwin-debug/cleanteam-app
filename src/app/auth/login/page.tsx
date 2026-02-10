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
import { Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function LoginPage() {
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

        // Check if Supabase client was initialized successfully
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
        const name = formData.get('name') as string // Only for signup
        const role = 'worker' // Always worker here

        // 아이디를 이메일 형식으로 변환 (도메인 통일: .temp)
        const email = `${username}@cleanteam.temp`

        try {
            // SIGN IN LOGIC
            console.log('🔐 로그인 시도:', { username, email });

            const { data: signInData, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error('❌ 로그인 에러:', error);
                throw error;
            }

            console.log('✅ 로그인 성공:', signInData.user?.email);

            // Check user role
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                console.log('👤 사용자 확인 완료:', user.id);

                let { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                // Fallback profile creation
                if (!profile) {
                    const nameToSet = user.user_metadata.name || '사용자'
                    // Default to worker
                    await supabase.from('users').insert([{ id: user.id, name: nameToSet, role: 'worker' }])
                    profile = { role: 'worker' }
                }

                // Redirect based on role
                if (profile?.role === 'admin') {
                    router.push('/admin/dashboard')
                } else {
                    router.push('/worker/home')
                }
                toast.success('로그인 성공')
            }
        } catch (err: any) {
            console.error('🚨 인증 오류:', err);

            // 더 상세한 오류 메시지 제공
            let errorMessage = err.message;

            if (err.message?.includes('Invalid login credentials')) {
                errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
            } else if (err.message?.includes('Email not confirmed')) {
                errorMessage = '이메일 확인이 필요합니다. Supabase 설정을 확인하세요.';
            } else if (err.message?.includes('User already registered')) {
                errorMessage = '이미 등록된 아이디입니다. 로그인을 시도하세요.';
            }

            toast.error('로그인 실패', { description: errorMessage })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-primary">Clean System</CardTitle>
                    <CardDescription>
                        현장 팀장 로그인
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">아이디</Label>
                            <Input id="username" name="username" type="text" placeholder="teamleader01" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '현장 팀장 로그인'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => router.push('/auth/register')}
                            className="text-sm text-slate-500 hover:text-primary underline"
                        >
                            현장 팀장 계정이 없으신가요? 회원가입
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
