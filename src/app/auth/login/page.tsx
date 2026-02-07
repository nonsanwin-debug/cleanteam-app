/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function LoginPage() {
    const [isMounted, setIsMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
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

    async function handleAuth(e: React.FormEvent<HTMLFormElement>, role: 'admin' | 'worker') {
        e.preventDefault()

        if (!supabase) {
            toast.error('연결 오류', { description: 'Supabase 클라이언트가 초기화되지 않았습니다.' })
            return
        }

        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const username = formData.get('username') as string // 아이디로 변경
        const password = formData.get('password') as string
        const name = formData.get('name') as string // Only for signup

        // 아이디를 이메일 형식으로 변환
        const email = `${username}@cleanteam.app`

        try {
            if (isSignUp) {
                // SIGN UP LOGIC
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name || (role === 'admin' ? '관리자' : '현장팀장'),
                            role: role,
                            username: username // 아이디 저장
                        },
                        emailRedirectTo: undefined // 이메일 확인 비활성화
                    }
                })
                if (error) throw error

                // 회원가입 성공 후 자동 로그인
                if (data.user) {
                    // Check user role
                    let { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', data.user.id)
                        .single()

                    // [Fallback] If profile doesn't exist (trigger failed), create it now
                    if (!profile) {
                        const roleToSet = data.user.user_metadata.role || 'worker'
                        const nameToSet = data.user.user_metadata.name || '사용자'

                        const { error: insertError } = await supabase
                            .from('users')
                            .insert([{ id: data.user.id, name: nameToSet, role: roleToSet }])

                        if (!insertError) {
                            profile = { role: roleToSet }
                        }
                    }

                    toast.success('회원가입 완료!', { description: '로그인되었습니다.' })

                    // Redirect based on role
                    if (profile?.role === 'admin') {
                        router.push('/admin/dashboard')
                    } else {
                        router.push('/worker/home')
                    }
                }
            } else {
                // SIGN IN LOGIC
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error

                // Check user role
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    let { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', user.id)
                        .single()

                    // [Fallback] If profile doesn't exist (trigger failed), create it now
                    if (!profile) {
                        const roleToSet = user.user_metadata.role || 'worker'
                        const nameToSet = user.user_metadata.name || '사용자'

                        const { error: insertError } = await supabase
                            .from('users')
                            .insert([{ id: user.id, name: nameToSet, role: roleToSet }])

                        if (!insertError) {
                            profile = { role: roleToSet }
                        }
                    }

                    // Redirect based on role
                    if (profile?.role === 'admin') {
                        router.push('/admin/dashboard')
                    } else {
                        if (role === 'admin') {
                            toast.error('로그인 실패: 권한 부족', {
                                description: '이 계정은 관리자 권한이 없습니다.'
                            })
                            return
                        }
                        router.push('/worker/home')
                    }
                    toast.success('로그인 성공')
                }
            }
        } catch (err: any) {
            toast.error(isSignUp ? '가입 실패' : '로그인 실패', { description: err.message })
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
                        {isSignUp ? '새 계정 만들기' : '현장 관리 시스템에 로그인하세요'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="worker" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="worker">현장 팀장</TabsTrigger>
                            <TabsTrigger value="admin">관리자</TabsTrigger>
                        </TabsList>

                        <TabsContent value="worker">
                            <form onSubmit={(e) => handleAuth(e, 'worker')} className="space-y-4">
                                {isSignUp && (
                                    <div className="space-y-2">
                                        <Label htmlFor="name-worker">이름</Label>
                                        <Input id="name-worker" name="name" placeholder="홍길동" required />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="username-worker">아이디</Label>
                                    <Input id="username-worker" name="username" type="text" placeholder="teamleader01" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password-worker">비밀번호</Label>
                                    <Input id="password-worker" name="password" type="password" required />
                                </div>
                                <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSignUp ? '팀장 등록하기' : '현장 팀장 로그인')}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="admin">
                            <form onSubmit={(e) => handleAuth(e, 'admin')} className="space-y-4">
                                {isSignUp && (
                                    <div className="space-y-2">
                                        <Label htmlFor="name-admin">이름</Label>
                                        <Input id="name-admin" name="name" placeholder="관리자명" required />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="username-admin">아이디</Label>
                                    <Input id="username-admin" name="username" type="text" placeholder="admin" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password-admin">비밀번호</Label>
                                    <Input id="password-admin" name="password" type="password" required />
                                </div>
                                <Button type="submit" variant="destructive" className="w-full" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSignUp ? '관리자 등록하기' : '관리자 로그인')}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-slate-500 hover:text-primary underline"
                        >
                            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
