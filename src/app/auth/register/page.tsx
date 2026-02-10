
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function WorkerRegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
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
            // Email is required for Supabase Auth, so we generate a placeholder email using phone number
            const email = `${formData.phone}@cleanteam.temp`

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        phone: formData.phone,
                        role: 'worker', // Explicitly Worker
                        company_name: formData.companyName // Trigger will try to find this company
                    }
                }
            })

            if (signUpError) throw signUpError

            if (data.user) {
                toast.success('회원가입 완료!', {
                    description: '로그인해주세요.'
                })
                router.push('/auth/login')
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
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-800">팀장/작업자 회원가입</CardTitle>
                        <CardDescription>
                            소속 업체명을 입력하고 가입하세요.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="name">성함 (팀장/작업자)</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                required
                                placeholder="홍길동 팀장"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">연락처 (아이디로 사용)</Label>
                            <Input
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                type="tel"
                                required
                                placeholder="010-0000-0000"
                                maxLength={13}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '')
                                    let formatted = value
                                    if (value.length > 3 && value.length <= 7) {
                                        formatted = `${value.slice(0, 3)}-${value.slice(3)}`
                                    } else if (value.length > 7) {
                                        formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`
                                    }
                                    setFormData({ ...formData, phone: formatted })
                                }}
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
                            <Label htmlFor="companyName">소속 업체명 (정확히 입력)</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                type="text"
                                required
                                placeholder="예: 클린프로 강남점"
                                className="border-blue-200 focus:border-blue-500"
                                onChange={handleChange}
                            />
                            <p className="text-xs text-slate-500">* 관리자에게 확인한 정확한 업체명을 입력해주세요.</p>
                        </div>

                        <Button type="submit" className="w-full py-6 mt-4" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '가입하기'}
                        </Button>

                        <div className="text-center text-sm pt-2">
                            <button type="button" onClick={() => router.push('/auth/login')} className="font-medium text-blue-600 hover:text-blue-500">
                                이미 계정이 있으신가요? 로그인
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
