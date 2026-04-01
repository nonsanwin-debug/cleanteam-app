'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { registerPartnerAccount } from '@/actions/auth-partner'

export default function PartnerRegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        password: '',
        name: '',
        phone: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { password, name, phone } = formData

            if (!password.trim() || !name.trim() || !phone.trim()) {
                toast.error('입력 오류', { description: '모든 항목을 입력해주세요.' })
                setLoading(false)
                return
            }

            if (password.length < 6) {
                toast.error('비밀번호 오류', { description: '비밀번호는 6자리 이상이어야 합니다.' })
                setLoading(false)
                return
            }

            // Server action to create partner + virtual company
            const res = await registerPartnerAccount(name.trim(), phone.trim(), password.trim())

            if (res.success) {
                toast.success('부동산 파트너 가입이 완료되었습니다!', {
                    description: '전화번호와 비밀번호로 로그인해주세요.'
                })
                router.push('/auth/partner-login')
            } else {
                toast.error('가입 실패', {
                    description: res.error || '알 수 없는 오류가 발생했습니다.'
                })
            }
        } catch (err: any) {
            console.error(err)
            toast.error('서버 오류', {
                description: err.message || '가입 처리 중 문제가 발생했습니다.'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-t-[4px] border-t-teal-600">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center mb-2">
                        <span className="font-black text-3xl text-slate-900 tracking-tighter flex items-center gap-2">
                            <svg viewBox="0 0 24 24" fill="none" className="w-[32px] h-[32px]" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="partner-reg-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#4F46E5" />
                                        <stop offset="100%" stopColor="#22D3EE" />
                                    </linearGradient>
                                    <linearGradient id="partner-reg-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#22D3EE" />
                                        <stop offset="100%" stopColor="#10B981" />
                                    </linearGradient>
                                    <linearGradient id="partner-reg-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#10B981" />
                                        <stop offset="100%" stopColor="#BEF264" />
                                    </linearGradient>
                                </defs>
                                <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#partner-reg-grad-1)" />
                                <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#partner-reg-grad-3)" />
                                <path d="M5.25 4.75L18.75 19.25" stroke="url(#partner-reg-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                            </svg>
                            <span className="pt-1">NEXUS</span>
                        </span>
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold text-slate-800">파트너 회원가입</CardTitle>
                        <CardDescription>
                            가입 즉시 NEXUS 오더 공유 파트너십이 시작됩니다.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="name">상호명</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                required
                                placeholder="예: 자이공인중개사"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">전화번호 (로그인 시 아이디로 사용됨)</Label>
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
                            <Label htmlFor="password">비밀번호 (6자리 이상)</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="********"
                                onChange={handleChange}
                            />
                        </div>

                        <Button type="submit" className="w-full py-6 mt-6 bg-teal-600 hover:bg-teal-700 text-lg shadow-md h-14" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : '파트너 가입하기'}
                        </Button>

                        <div className="text-center text-sm pt-4 pb-2">
                            <button type="button" onClick={() => router.push('/auth/partner-login')} className="font-medium text-teal-600 hover:text-teal-500">
                                이미 파트너 계정이 있으신가요? 로그인
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
