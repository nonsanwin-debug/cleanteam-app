'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Building2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function PartnerLoginPage() {
    const [isMounted, setIsMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [keepLoggedIn, setKeepLoggedIn] = useState(true)
    const router = useRouter()

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
    }, [])

    if (!isMounted || !supabase) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading...</div>
    }

    async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!supabase) return

        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            const { data: signInData, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim(),
            })

            if (error) {
                throw error;
            }

            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile?.role === 'partner') {
                    toast.success('로그인 성공', { description: '파트너 포털로 이동합니다.' })
                    router.refresh()
                    router.push('/field/home')
                } else {
                    await supabase.auth.signOut()
                    toast.error('접근 거부', { description: '파트너 계정이 아닙니다.' })
                }
            }
        } catch (err: any) {
            let errorMessage = err.message || '로그인에 실패했습니다.';
            if (err.message?.includes('Invalid login credentials')) {
                errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
            }
            toast.error('로그인 실패', { description: errorMessage })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md border-t-[4px] border-t-teal-600 shadow-md">
                <CardHeader className="text-center pb-6">
                    <div className="mx-auto w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-6 h-6 text-teal-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">부동산 파트너 로그인</CardTitle>
                    <CardDescription className="text-base mt-2">
                        NEXUS와 제휴된 부동산 중개인 전용입니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일 (아이디)</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="가입하신 이메일 주소"
                                required
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="비밀번호"
                                    required
                                    className="h-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="keepLoggedIn" 
                                checked={keepLoggedIn}
                                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                                className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                            />
                            <Label htmlFor="keepLoggedIn" className="text-sm font-medium text-slate-700 cursor-pointer">
                                로그인 상태 유지
                            </Label>
                        </div>

                        <Button type="submit" className="w-full h-14 text-lg bg-teal-600 hover:bg-teal-700 text-white shadow-md mt-6" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : '로그인'}
                        </Button>

                        <div className="mt-6 text-center text-sm pt-2">
                            <button
                                type="button"
                                onClick={() => router.push('/auth/partner-register')}
                                className="font-medium text-slate-500 hover:text-teal-600 underline"
                            >
                                파트너 계정이 없으신가요? 회원가입
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
