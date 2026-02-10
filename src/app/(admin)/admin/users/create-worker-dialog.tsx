'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
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
import { UserPlus, Loader2 } from 'lucide-react'

export function CreateWorkerDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
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
                toast.success('팀원이 생성되었습니다.')
                setOpen(false)
                setFormData({
                    loginId: '',
                    name: '',
                    phone: '',
                    password: '',
                    workerType: 'member',
                    accountInfo: '',
                    email: ''
                })
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    새 팀원 추가
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>새 팀원 추가</DialogTitle>
                        <DialogDescription>
                            새로운 팀원 또는 팀장 계정을 생성합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="loginId">아이디 *</Label>
                            <Input
                                id="loginId"
                                value={formData.loginId}
                                onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                                placeholder="영문, 숫자 입력"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">이름 *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="홍길동"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">전화번호 *</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                placeholder="010-1234-5678"
                                maxLength={13}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
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
                        <div className="grid gap-2">
                            <Label htmlFor="accountInfo">계좌번호</Label>
                            <Input
                                id="accountInfo"
                                value={formData.accountInfo}
                                onChange={(e) => setFormData({ ...formData, accountInfo: e.target.value })}
                                placeholder="은행명 123-456-789 예금주"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="workerType">역할 *</Label>
                            <Select
                                value={formData.workerType}
                                onValueChange={(value: 'leader' | 'member') =>
                                    setFormData({ ...formData, workerType: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">팀원</SelectItem>
                                    <SelectItem value="leader">팀장</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            취소
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    생성 중...
                                </>
                            ) : (
                                '생성'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
