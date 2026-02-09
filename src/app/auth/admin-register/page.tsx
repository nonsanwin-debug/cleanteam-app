
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminRegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        companyName: '',
        phone: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()

            // 1. Sign Up
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        phone: formData.phone,
                        role: 'admin',
                        company_name: formData.companyName // Trigger will handle Company Creation
                    }
                }
            })

            if (signUpError) throw signUpError

            if (data.user) {
                toast.success('회원가입 완료!', {
                    description: '이메일 인증 후 로그인해주세요.'
                })
                router.push('/auth/admin-login')
            }

        } catch (err: any) {
            console.error(err)
            toast.error('회원가입 실패', {
                description: err.message || '오류가 발생했습니다.'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 border-t-8 border-indigo-600">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-800">업체 관리자 회원가입</CardTitle>
                        <CardDescription>
                            새로운 청소 업체를 등록하고 관리자로 시작하세요.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="name@company.com"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="********"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">관리자 성함</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                required
                                placeholder="홍길동"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">연락처</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                placeholder="010-0000-0000"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyName">업체명 (Company Name)</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                type="text"
                                required
                                placeholder="예: 클린프로 강남점"
                                className="border-indigo-200 focus:border-indigo-500"
                                onChange={handleChange}
                            />
                        </div>

                        <Button type="submit" className="w-full py-6 mt-4 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '업체 생성 및 가입하기'}
                        </Button>

                        <div className="text-center text-sm pt-2">
                            <button type="button" onClick={() => router.push('/auth/admin-login')} className="font-medium text-indigo-600 hover:text-indigo-500">
                                이미 계정이 있으신가요? 로그인
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
