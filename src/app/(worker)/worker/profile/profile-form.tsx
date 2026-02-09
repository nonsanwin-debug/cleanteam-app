'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { User, LogOut, Save, Loader2, Phone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useState } from 'react'
import { updateWorkerProfile } from '@/actions/worker'

interface ProfileFormProps {
    user: any
}

export function ProfileForm({ user }: ProfileFormProps) {
    const router = useRouter()
    const supabase = createClient()
    const [isEditing, setIsEditing] = useState(false)
    const [phone, setPhone] = useState(user?.phone || '')
    const [accountInfo, setAccountInfo] = useState(user?.account_info || '')
    const [saving, setSaving] = useState(false)
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/')
        toast.success('로그아웃 되었습니다.')
    }

    async function handleSave() {
        if (!phone.trim()) {
            toast.error('연락처를 입력해주세요.')
            return
        }

        setSaving(true)
        try {
            const result = await updateWorkerProfile(phone, accountInfo)
            if (result.success) {
                toast.success('정보가 수정되었습니다.')
                setIsEditing(false)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('저장 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
                    <User className="w-8 h-8 text-slate-500" />
                </div>
                <CardTitle className="text-center">{user?.name || '사용자'}</CardTitle>
                <div className="text-center mt-2">
                    <div className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-200">
                        ₩ {(user?.current_money || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">지급받은 총 금액</p>
                    <Button
                        size="sm"
                        variant="default"
                        className="mt-2 h-7 text-xs"
                        onClick={() => setIsWithdrawModalOpen(true)}
                    >
                        출금하기
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-slate-500 w-20">소속</span>
                        <span className="font-medium flex-1 text-right">
                            {user?.companies?.name || '미소속'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2 py-2 border-b">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 w-20">연락처</span>
                            {!isEditing && (
                                <span className="font-medium flex-1 text-right">{user?.phone || '미등록'}</span>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="flex gap-2 mt-2">
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="010-0000-0000"
                                    type="tel"
                                />
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-2 py-2 border-b">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 w-20">계좌번호</span>
                            {!isEditing && (
                                <span className="font-medium flex-1 text-right">{user?.account_info || '미등록'}</span>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="flex gap-2 mt-2">
                                <Input
                                    value={accountInfo}
                                    onChange={(e) => setAccountInfo(e.target.value)}
                                    placeholder="은행명 계좌번호 예금주"
                                />
                            </div>
                        ) : null}
                    </div>

                    {!isEditing ? (
                        <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                            정보 수정
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => {
                                setIsEditing(false)
                                setPhone(user?.phone || '')
                                setAccountInfo(user?.account_info || '')
                            }}>
                                취소
                            </Button>
                            <Button className="flex-1" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                저장
                            </Button>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t mt-6">
                    <Button variant="destructive" className="w-full" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> 로그아웃
                    </Button>
                </div>
            </CardContent>

            <WithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                user={user}
                onSuccess={() => {
                    setIsWithdrawModalOpen(false)
                    router.refresh()
                }}
            />
        </Card>
    )
}

function WithdrawModal({ isOpen, onClose, user, onSuccess }: { isOpen: boolean, onClose: () => void, user: any, onSuccess: () => void }) {
    const [amount, setAmount] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [bankInfo, setBankInfo] = useState({
        bank: '',
        account: '',
        holder: ''
    })

    // Parse bank info from user.account_info (assuming format "Bank Account Holder")
    // Or just let them input it manually to confirm
    // For simplicity, let's pre-fill if possible or just use what we have
    // The user requirement says "input withdraw amount and confirm".
    // I will show current account info and allow confirmation.

    async function handleSubmit() {
        const amt = parseInt(amount.replace(/,/g, ''), 10)
        if (isNaN(amt) || amt <= 0) {
            alert('올바른 금액을 입력해주세요.')
            return
        }
        if (amt > (user.current_money || 0)) {
            alert('출금 가능 금액을 초과했습니다.')
            return
        }

        setSubmitting(true)
        try {
            const { requestWithdrawal } = await import('@/actions/worker')
            const result = await requestWithdrawal(amt, {
                bank: user?.account_info || 'Unknown',
                account: user?.account_info || 'Unknown',
                holder: user?.name || 'Unknown'
            })

            if (result.success) {
                alert('출금 요청이 완료되었습니다.')
                onSuccess()
            } else {
                alert(result.error)
            }
        } catch (e) {
            alert('오류가 발생했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-sm">
                <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold">출금 요청</h3>
                    <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
                        <div className="flex justify-between">
                            <span>출금 가능 금액</span>
                            <span className="font-bold text-slate-900">{(user.current_money || 0).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span>계좌 정보</span>
                            <span className="font-medium text-right break-all">{user.account_info || '미등록'}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">요청 금액</label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="금액 입력"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            취소
                        </Button>
                        <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            확인
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
