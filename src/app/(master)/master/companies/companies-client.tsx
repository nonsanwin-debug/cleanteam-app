'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { updateCompanyStatus, manageCompanyPoints } from '@/actions/master'
import { createMasterNotice } from '@/actions/inquiries'
import { RefreshCw, CheckCircle, XCircle, Plus, Minus, Building2, MessageSquarePlus, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'

export function MasterCompaniesClient({ initialCompanies }: { initialCompanies: any[] }) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)
    const [pointDialog, setPointDialog] = useState<{ open: boolean, companyId: string, companyName: string, actionType: 'add' | 'deduct' }>({
        open: false, companyId: '', companyName: '', actionType: 'add'
    })
    const [pointAmount, setPointAmount] = useState<string>('')

    const [messageDialog, setMessageDialog] = useState<{ open: boolean, companyId: string, companyName: string }>({
        open: false, companyId: '', companyName: ''
    })
    const [messageContent, setMessageContent] = useState<string>('')

    const handleStatusUpdate = async (companyId: string, status: 'approved' | 'rejected' | 'deleted') => {
        const actionMap = {
            'approved': '승인',
            'rejected': '반려',
            'deleted': '강제 탈퇴'
        }
        
        if (!confirm(`이 업체를 ${actionMap[status]} 처리하시겠습니까?`)) return

        setIsUpdating(true)
        const result = await updateCompanyStatus(companyId, status)
        setIsUpdating(false)

        if (result.success) {
            alert('상태가 변경되었습니다.')
            router.refresh()
        } else {
            alert(result.error || '오류가 발생했습니다.')
        }
    }

    const handlePointUpdate = async () => {
        const amount = parseInt(pointAmount.replace(/,/g, ''))
        if (isNaN(amount) || amount <= 0) {
            alert('유효한 금액을 입력하세요.')
            return
        }

        setIsUpdating(true)
        const result = await manageCompanyPoints(pointDialog.companyId, amount, pointDialog.actionType)
        setIsUpdating(false)

        if (result.success) {
            alert('포인트가 처리되었습니다.')
            setPointDialog({ ...pointDialog, open: false })
            setPointAmount('')
            router.refresh()
        } else {
            alert(result.error || '오류가 발생했습니다.')
        }
    }

    const formatPoints = (amount: string) => {
        const value = amount.replace(/[^0-9]/g, '');
        return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    const onPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPointAmount(formatPoints(e.target.value))
    }

    const handleSendMessage = async () => {
        if (!messageContent.trim()) {
            alert('메시지 내용을 입력하세요.')
            return
        }
        setIsUpdating(true)
        const result = await createMasterNotice(messageDialog.companyId, messageContent)
        setIsUpdating(false)
        if (result.success) {
            alert('메시지가 성공적으로 발송되었습니다.')
            setMessageDialog({ ...messageDialog, open: false })
            setMessageContent('')
        } else {
            alert(result.error || '메시지 발송에 실패했습니다.')
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-500" />
                        등록된 업체 목록
                    </CardTitle>
                    <CardDescription>
                        총 {initialCompanies.length}개의 업체가 플랫폼에 등록되어 있습니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left align-middle border-collapse">
                            <thead>
                                <tr className="border-b bg-slate-50/50">
                                    <th className="p-4 font-medium text-slate-500 w-[120px]">코드</th>
                                    <th className="p-4 font-medium text-slate-500 w-[200px]">업체명</th>
                                    <th className="p-4 font-medium text-slate-500 w-[100px]">상태</th>
                                    <th className="p-4 font-medium text-slate-500 w-[150px]">잔여 포인트</th>
                                    <th className="p-4 font-medium text-slate-500 w-[150px]">가입일</th>
                                    <th className="p-4 font-medium text-slate-500 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {initialCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-mono text-slate-600">{company.code || '-'}</td>
                                        <td className="p-4 font-medium text-slate-900">{company.name}</td>
                                        <td className="p-4">
                                            {company.status === 'pending' && <Badge variant="outline" className="text-amber-600 bg-amber-50">승인 대기</Badge>}
                                            {company.status === 'approved' && <Badge variant="outline" className="text-indigo-600 bg-indigo-50">승인 완료</Badge>}
                                            {company.status === 'rejected' && <Badge variant="outline" className="text-red-600 bg-red-50">가입 반려</Badge>}
                                            {(!company.status || company.status === 'deleted') && <Badge variant="outline" className="text-slate-600 bg-slate-50">비활성</Badge>}
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">
                                            {company.points?.toLocaleString() || 0} P
                                        </td>
                                        <td className="p-4 text-slate-500">
                                            {format(new Date(company.created_at), 'yyyy-MM-dd')}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {company.status === 'pending' && (
                                                    <>
                                                        <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => handleStatusUpdate(company.id, 'approved')} disabled={isUpdating}>
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            승인
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleStatusUpdate(company.id, 'rejected')} disabled={isUpdating}>
                                                            <XCircle className="w-4 h-4 mr-1" />
                                                            거절
                                                        </Button>
                                                    </>
                                                )}
                                                {company.status === 'approved' && (
                                                    <>
                                                        <Button size="sm" variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => setPointDialog({ open: true, companyId: company.id, companyName: company.name, actionType: 'add' })}>
                                                            <Plus className="w-4 h-4 mr-1" />
                                                            충전
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setPointDialog({ open: true, companyId: company.id, companyName: company.name, actionType: 'deduct' })}>
                                                            <Minus className="w-4 h-4 mr-1" />
                                                            차감
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => setMessageDialog({ open: true, companyId: company.id, companyName: company.name })}>
                                                            <MessageSquarePlus className="w-4 h-4 mr-1" />
                                                            메시지 발송
                                                        </Button>
                                                    </>
                                                )}
                                                {company.status === 'rejected' && (
                                                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(company.id, 'approved')} disabled={isUpdating}>
                                                        재승인 처리
                                                    </Button>
                                                )}
                                                {(company.status !== 'deleted' && company.status !== 'pending') && (
                                                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleStatusUpdate(company.id, 'deleted')} disabled={isUpdating}>
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        강제 탈퇴
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {initialCompanies.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            등록된 업체가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={pointDialog.open} onOpenChange={(open) => !open && setPointDialog({ ...pointDialog, open: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{pointDialog.actionType === 'add' ? '포인트 충전' : '포인트 차감'}</DialogTitle>
                        <DialogDescription>
                            {pointDialog.companyName} 업체에 포인트를 {pointDialog.actionType === 'add' ? '충전' : '차감'}합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>금액</Label>
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={pointAmount}
                                    onChange={onPointChange}
                                    className="pl-8 text-lg font-bold"
                                    placeholder="0"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">P</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPointDialog({ ...pointDialog, open: false })}>취소</Button>
                        <Button
                            className={pointDialog.actionType === 'add' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
                            onClick={handlePointUpdate}
                            disabled={isUpdating || !pointAmount}
                        >
                            {isUpdating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                            {pointDialog.actionType === 'add' ? '충전하기' : '차감하기'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={messageDialog.open} onOpenChange={(open) => !open && setMessageDialog({ ...messageDialog, open: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>어드민(업체) 메시지 발송</DialogTitle>
                        <DialogDescription>
                            {messageDialog.companyName} 관리자(어드민)에게 직접 확인 가능한 메시지를 보냅니다. 해당 메시지는 업체의 '1:1 문의 / 요청' 목록에 공지사항 형태로 표시됩니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>메시지 내용</Label>
                            <Textarea
                                placeholder="어드민에게 전달할 내용을 입력하세요."
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                                rows={5}
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMessageDialog({ ...messageDialog, open: false })}>취소</Button>
                        <Button
                            className={'bg-indigo-600 hover:bg-indigo-700 text-white'}
                            onClick={handleSendMessage}
                            disabled={isUpdating || !messageContent.trim()}
                        >
                            {isUpdating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                            <Send className="mr-2 w-4 h-4" />
                            전송하기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
