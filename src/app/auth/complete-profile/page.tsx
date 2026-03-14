'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ClipboardEdit } from 'lucide-react'
import { toast } from 'sonner'
import { TermsDialog } from '@/components/auth/terms-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { completeUserProfile } from '@/actions/profile'

export default function CompleteProfilePage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [isTermsOpen, setIsTermsOpen] = useState(false)

    const [formData, setFormData] = useState({
        role: 'worker', // 'worker' or 'admin'
        companyInput: '', // For worker: "Company#1234", For admin: "Company"
        phone: '',
        bankName: '',
        bankAccountNumber: '',
        bankAccountHolder: '',
    })

    useEffect(() => {
        async function fetchUser() {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error || !session) {
                router.push('/auth/login')
                return
            }
            setUser(session.user)
            setPageLoading(false)
        }
        fetchUser()
    }, [router, supabase.auth])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!agreedToTerms) {
            toast.error('약관 동의 필요', { description: 'NEXUS 서비스 이용약관에 동의해야 합니다.' })
            return
        }

        setLoading(true)

        try {
            const result = await completeUserProfile({
                userId: user.id,
                role: formData.role,
                companyInput: formData.companyInput,
                phone: formData.phone,
                bankName: formData.bankName,
                bankAccountNumber: formData.bankAccountNumber,
                bankAccountHolder: formData.bankAccountHolder
            })

            if (!result.success) {
                toast.error('프로필 설정 실패', { description: result.message })
                setLoading(false)
                return
            }

            toast.success('프로필 설정 완료!', { description: 'NEXUS 환영합니다.' })
            router.refresh()
            if (formData.role === 'admin') {
                router.push('/admin/dashboard')
            } else {
                router.push('/worker/home')
            }

        } catch (err: any) {
            console.error(err)
            toast.error('저장 실패', { description: err.message || '오류가 발생했습니다.' })
        } finally {
            setLoading(false)
        }
    }

    if (pageLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400 w-8 h-8" /></div>
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <TermsDialog open={isTermsOpen} onOpenChange={setIsTermsOpen} />
            <Card className="w-full max-w-md shadow-xl border-t-8 border-indigo-600">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <ClipboardEdit className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-800">추가 정보 입력</CardTitle>
                        <CardDescription>
                            가입을 완료하기 위해 필수 항목을 입력해주세요.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-3">
                            <Label>가입 유형 선택</Label>
                            <RadioGroup 
                                defaultValue="worker" 
                                onValueChange={(val) => setFormData({...formData, role: val, companyInput: ''})}
                                className="flex space-x-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="worker" id="r-worker" />
                                    <Label htmlFor="r-worker">현장 작업자 (팀장/팀원)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="admin" id="r-admin" />
                                    <Label htmlFor="r-admin">업체 관리자</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyInput">
                                {formData.role === 'worker' ? '소속 업체 코드 (업체명#고유코드)' : '새로 등록할 업체명 (띄어쓰기 금지)'}
                            </Label>
                            <Input
                                id="companyInput"
                                name="companyInput"
                                type="text"
                                required
                                value={formData.companyInput}
                                placeholder={formData.role === 'worker' ? "예: 클린프로#1234" : "예: 클린프로"}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">연락처</Label>
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

                        <div className="space-y-2 border-t pt-4">
                            <Label className="font-bold text-slate-800">정산 계좌 등록 (필수)</Label>
                            <p className="text-xs text-slate-500 mb-2">보수 정산을 받을 본인 명의 계좌를 정확히 입력해주세요.</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="bankName" className="text-xs">은행명</Label>
                                    <Input id="bankName" name="bankName" required placeholder="예: 구글뱅크" onChange={handleChange} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="bankAccountHolder" className="text-xs">예금주</Label>
                                    <Input id="bankAccountHolder" name="bankAccountHolder" required placeholder="예: 홍길동" onChange={handleChange} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="bankAccountNumber" className="text-xs">계좌번호 (- 제외)</Label>
                                <Input id="bankAccountNumber" name="bankAccountNumber" required placeholder="숫자만 입력" type="number" onChange={handleChange} />
                            </div>
                        </div>

                        <div className="flex items-start space-x-2 pt-2 border-t">
                            <Checkbox 
                                id="terms" 
                                checked={agreedToTerms} 
                                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} 
                                className="mt-1"
                            />
                            <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 text-left"
                            >
                                <button type="button" onClick={() => setIsTermsOpen(true)} className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 font-bold mx-1">
                                    NEXUS 서비스 이용약관 (정산 및 방침)
                                </button>
                                에 동의합니다.
                            </label>
                        </div>

                        <Button type="submit" className="w-full py-6 mt-4 bg-indigo-600 hover:bg-indigo-700 text-lg" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '프로필 완성 및 시작하기'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
