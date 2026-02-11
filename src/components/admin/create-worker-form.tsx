'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createWorker } from '@/actions/admin'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export function CreateWorkerForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        loginId: '',
        name: '',
        phone: '',
        password: '',
        workerType: 'member' as 'leader' | 'member',
        accountInfo: '',
        email: ''
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!formData.loginId || !formData.name || !formData.phone || !formData.password) {
            toast.error('필수 항목을 입력해주세요.')
            return
        }

        setLoading(true)
        try {
            const result = await createWorker(formData)
            if (result.success) {
                toast.success('팀원이 성공적으로 생성되었습니다.')
                router.push('/admin/users')
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '')
        let formatted = value
        if (value.length > 3 && value.length <= 7) {
            formatted = `${value.slice(0, 3)}-${value.slice(3)}`
        } else if (value.length > 7) {
            formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`
        }
        setFormData({ ...formData, phone: formatted })
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/users">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-2xl font-bold tracking-tight">새 팀원 등록</h2>
            </div>

            <Card className="shadow-md border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        팀원 정보 입력
                    </CardTitle>
                    <CardDescription>
                        새로운 팀원 또는 팀장 계정을 생성합니다. 등록된 정보로 바로 로그인이 가능합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="loginId">아이디 *</Label>
                                <Input
                                    id="loginId"
                                    value={formData.loginId}
                                    onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                                    placeholder="로그인에 사용할 아이디"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">초기 비밀번호 *</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="최소 6자 이상"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">이름 *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="실명 입력"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">전화번호 *</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    placeholder="010-0000-0000"
                                    maxLength={13}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accountInfo">정산 계좌 정보</Label>
                            <Input
                                id="accountInfo"
                                value={formData.accountInfo}
                                onChange={(e) => setFormData({ ...formData, accountInfo: e.target.value })}
                                placeholder="은행명 계좌번호 예금주"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="workerType">역할 구분 *</Label>
                            <Select
                                value={formData.workerType}
                                onValueChange={(value: 'leader' | 'member') =>
                                    setFormData({ ...formData, workerType: value })
                                }
                            >
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <SelectValue placeholder="역할 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">팀원 (일반)</SelectItem>
                                    <SelectItem value="leader">팀장 (현장 관리)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">팀장은 현장 관리 및 완료 처리가 가능합니다.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Link href="/admin/users">
                                <Button type="button" variant="outline">
                                    취소
                                </Button>
                            </Link>
                            <Button type="submit" disabled={loading} className="px-8 bg-indigo-600 hover:bg-indigo-700">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        생성 중...
                                    </>
                                ) : (
                                    '팀원 생성하기'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
