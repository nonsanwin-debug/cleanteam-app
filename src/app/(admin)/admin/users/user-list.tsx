'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { approvePayment, rejectClaim } from '@/actions/admin'
import { Loader2, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserWithClaims {
    id: string
    name: string
    phone: string
    account_info?: string
    current_money: number
    totalPending: number
    claims: Array<{
        id: string
        name: string
        claimed_amount: number
        payment_status: string
        created_at: string
    }>
}

export function UserList({ users }: { users: UserWithClaims[] }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [rejectingId, setRejectingId] = useState<string | null>(null)

    async function handleApprove(siteId: string, userId: string, amount: number) {
        if (!confirm(`${amount.toLocaleString()}원을 지급 승인하시겠습니까?`)) return

        setProcessingId(siteId)
        try {
            const result = await approvePayment(siteId, userId, amount)
            if (result.success) {
                toast.success('지급 처리되었습니다.')
                window.location.reload()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.')
        } finally {
            setProcessingId(null)
        }
    }

    async function handleReject(siteId: string, siteName: string) {
        const reason = prompt(`"${siteName}" 청구를 반려합니다.\n반려 사유를 입력하세요:`)
        if (reason === null) return
        if (!reason.trim()) {
            toast.error('반려 사유를 입력해주세요.')
            return
        }

        setRejectingId(siteId)
        try {
            const result = await rejectClaim(siteId, reason.trim())
            if (result.success) {
                toast.success('청구가 반려되었습니다.')
                window.location.reload()
            } else {
                toast.error(result.error)
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.')
        } finally {
            setRejectingId(null)
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {users.map(user => (
                <Card key={user.id} className="overflow-hidden">
                    <CardContent className="p-0">
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border rounded-full flex items-center justify-center">
                                    <User className="text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{user.name}</h3>
                                    <p className="text-sm text-slate-500">{user.phone || '연락처 없음'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-400 block">지급 완료 총액</span>
                                <span className="font-bold text-green-600">₩ {user.current_money?.toLocaleString() || 0}</span>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="text-sm">
                                <span className="text-slate-500 w-20 inline-block">계좌정보</span>
                                <span className="font-medium">{user.account_info || '미등록'}</span>
                            </div>

                            <div className="border-t pt-3">
                                <h4 className="text-sm font-semibold flex items-center justify-between mb-2">
                                    청구 내역 (지급 대기)
                                    <span className="text-orange-600">총 {user.totalPending.toLocaleString()}원</span>
                                </h4>

                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {user.claims.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-4">대기 중인 청구 내역이 없습니다.</p>
                                    ) : (
                                        user.claims.map(claim => (
                                            <div key={claim.id} className="p-2 bg-slate-50 rounded border">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="min-w-0 flex-1 mr-2">
                                                        <Link href={`/admin/sites/${claim.id}`} className="text-xs font-medium truncate hover:underline hover:text-blue-600 block">
                                                            {claim.name}
                                                        </Link>
                                                        <p className="text-[10px] text-slate-400">{new Date(claim.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className="text-sm font-bold">{claim.claimed_amount.toLocaleString()}원</span>
                                                </div>
                                                <div className="flex gap-1.5 mt-1.5">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-7 text-xs"
                                                        onClick={() => handleApprove(claim.id, user.id, claim.claimed_amount)}
                                                        disabled={!!processingId || !!rejectingId}
                                                    >
                                                        {processingId === claim.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '지급 승인'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                                                        onClick={() => handleReject(claim.id, claim.name)}
                                                        disabled={!!processingId || !!rejectingId}
                                                    >
                                                        {rejectingId === claim.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <>
                                                            <X className="h-3 w-3 mr-0.5" />
                                                            반려
                                                        </>}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
