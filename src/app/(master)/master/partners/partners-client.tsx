'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { deleteUserForce, manageCompanyPoints } from '@/actions/master'
import { Trash2, Building2, Search, PlusCircle, Loader2, Plus, Minus, RefreshCw, Gift } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Switch } from '@/components/ui/switch'

export function MasterPartnersClient({ initialPartners }: { initialPartners: any[] }) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Create Partner State
    const [createOpen, setCreateOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [partnerName, setPartnerName] = useState('')
    const [partnerPhone, setPartnerPhone] = useState('')
    const [partnerPassword, setPartnerPassword] = useState('')

    // Point Management State
    const [pointDialog, setPointDialog] = useState<{ open: boolean, companyId: string, companyName: string, actionType: 'add' | 'deduct', currency: 'points' | 'cash' | 'booking_points' }>({
        open: false, companyId: '', companyName: '', actionType: 'add', currency: 'points'
    })
    const [pointAmount, setPointAmount] = useState<string>('')

    // Benefits State
    const [benefitsDialog, setBenefitsDialog] = useState<{ open: boolean, companyId: string, companyName: string, benefits: any }>({
        open: false, companyId: '', companyName: '', benefits: {}
    })


    const supabase = createClient()

    const handlePointUpdate = async () => {
        const amount = parseInt(pointAmount.replace(/,/g, ''))
        if (isNaN(amount) || amount <= 0) {
            toast.error('유효한 금액을 입력하세요.')
            return
        }

        setIsUpdating(true)
        const result = await manageCompanyPoints(pointDialog.companyId, amount, pointDialog.actionType, pointDialog.currency)
        setIsUpdating(false)

        if (result.success) {
            toast.success('포인트가 처리되었습니다.')
            setPointDialog({ ...pointDialog, open: false })
            setPointAmount('')
            router.refresh()
        } else {
            toast.error(result.error || '오류가 발생했습니다.')
        }
    }

    const handleBenefitsUpdate = async () => {
        setIsUpdating(true)
        const { updatePartnerBenefits } = await import('@/actions/master-partner')
        const result = await updatePartnerBenefits(benefitsDialog.companyId, benefitsDialog.benefits)
        setIsUpdating(false)

        if (result.success) {
            toast.success('파트너 혜택이 저장되었습니다.')
            setBenefitsDialog({ ...benefitsDialog, open: false })
            router.refresh()
        } else {
            toast.error(result.error || '오류가 발생했습니다.')
        }
    }

    const formatPoints = (amount: string) => {
        const value = amount.replace(/[^0-9]/g, '');
        return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    const onPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPointAmount(formatPoints(e.target.value))
    }

    const handleDeletePartner = async (userId: string, userName: string) => {
        if (!confirm(`[경고] 정말로 ${userName} 파트너를 강제 탈퇴시키겠습니까?\n이 작업은 복구할 수 없습니다.`)) return

        setIsUpdating(true)
        const result = await deleteUserForce(userId)
        setIsUpdating(false)

        if (result.success) {
            toast.success('해당 파트너가 강제 탈퇴 처리되었습니다.')
            router.refresh()
        } else {
            toast.error(result.error || '오류가 발생했습니다.')
        }
    }

    const handleCreatePartner = async () => {
        if (!partnerName.trim() || !partnerPhone.trim() || !partnerPassword.trim()) {
            toast.error('이름, 연락처, 비밀번호를 모두 입력해주세요.')
            return
        }

        setSubmitting(true)
        try {
            const { createPartnerAccount } = await import('@/actions/master-partner')
            const res = await createPartnerAccount(partnerName, partnerPhone, partnerPassword)
            
            if (res.success) {
                toast.success('부동산 파트너 계정이 생성되었습니다.')
                setCreateOpen(false)
                setPartnerName('')
                setPartnerPhone('')
                setPartnerPassword('')
                router.refresh()
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error(error.message || '파트너 계정 생성 실패')
        } finally {
            setSubmitting(false)
        }
    }

    const filteredPartners = initialPartners.filter(p => {
        const lower = searchTerm.toLowerCase()
        return lower === '' || 
            p.name.toLowerCase().includes(lower) || 
            (p.phone && p.phone.includes(lower))
    })

    return (
        <>
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-teal-600" />
                        파트너(부동산) 관리
                    </CardTitle>
                    <CardDescription className="mt-1">
                        등록된 파트너 수: {initialPartners.length}명
                    </CardDescription>
                </div>
                
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-teal-600 hover:bg-teal-700">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            새 파트너 생성
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>새 부동산 파트너 등록</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium">부동산 이름 (회원명) *</label>
                                <Input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="예: 자이공인중개사" className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">연락처 (로그인 아이디) *</label>
                                <Input value={partnerPhone} onChange={e => setPartnerPhone(e.target.value)} placeholder="010-0000-0000" className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">비밀번호 *</label>
                                <Input type="password" value={partnerPassword} onChange={e => setPartnerPassword(e.target.value)} placeholder="6자리 이상 입력" className="mt-1" />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                            <Button onClick={handleCreatePartner} disabled={submitting} className="bg-teal-600 hover:bg-teal-700 text-white">
                                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                등록 완료
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                
                {/* Search Input */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input 
                        placeholder="이름, 전화번호, 이메일로 파트너를 검색해 보세요..."
                        className="pl-12 h-14 bg-white border-slate-200 shadow-sm text-base rounded-xl focus-visible:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto bg-white border border-slate-100 rounded-lg shadow-sm">
                    <table className="w-full text-left align-middle border-collapse">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-3 pl-4 font-semibold text-xs text-slate-600 w-[180px]">이름 (부동산명)</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 w-[100px]">상태</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 w-[200px]">연락처 (로그인 ID)</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 w-[150px]">보유 활동 포인트</th>
                                <th className="p-3 font-semibold text-xs text-teal-600 w-[150px]">예약 할인 포인트</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 w-[150px]">가입일</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredPartners.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        조회된 파트너가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredPartners.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 py-3 font-bold text-slate-900 border-l-[3px] border-l-teal-500">{p.name}</td>
                                        <td className="p-4 py-3">
                                            {p.status === 'active' && <Badge variant="outline" className="text-green-600 bg-green-50">정상</Badge>}
                                            {p.status === 'deleted' && <Badge variant="outline" className="text-red-600 bg-red-50">탈퇴</Badge>}
                                        </td>
                                        <td className="p-4 py-3 text-slate-500 text-sm">{p.phone || '-'}</td>
                                        <td className="p-4 py-3 font-bold text-slate-700">
                                            {p.companies?.points?.toLocaleString() || 0} P
                                        </td>
                                        <td className="p-4 py-3 font-bold text-teal-600">
                                            {p.companies?.booking_points?.toLocaleString() || 0} P
                                        </td>
                                        <td className="p-4 py-3 text-slate-500 text-sm">{format(new Date(p.created_at), 'yyyy-MM-dd HH:mm')}</td>
                                        <td className="p-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {p.companies?.id && (
                                                    <>
                                                        <Button size="sm" variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50 h-8 text-xs px-2" onClick={() => setBenefitsDialog({ open: true, companyId: p.companies.id, companyName: p.name, benefits: p.companies.benefits || {} })}>
                                                            <Gift className="w-3.5 h-3.5 mr-1" />
                                                            혜택
                                                        </Button>
                                                        
                                                        {/* Activity Points */}
                                                        <div className="flex bg-slate-100 rounded-md p-0.5 ml-1 mr-1">
                                                            <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-slate-600 hover:text-indigo-600" onClick={() => setPointDialog({ open: true, companyId: p.companies.id, companyName: p.name, actionType: 'add', currency: 'points' })}>
                                                                <Plus className="w-3 h-3 mr-0.5" />활동P 지급
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-slate-600 hover:text-rose-600" onClick={() => setPointDialog({ open: true, companyId: p.companies.id, companyName: p.name, actionType: 'deduct', currency: 'points' })}>
                                                                <Minus className="w-3 h-3 mr-0.5" />활동P 차감
                                                            </Button>
                                                        </div>

                                                        {/* Booking Points */}
                                                        <div className="flex bg-teal-50 border border-teal-100 rounded-md p-0.5 mr-1">
                                                            <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-teal-700 hover:bg-teal-100" onClick={() => setPointDialog({ open: true, companyId: p.companies.id, companyName: p.name, actionType: 'add', currency: 'booking_points' })}>
                                                                <Plus className="w-3 h-3 mr-0.5" />예약P 지급
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-teal-700 hover:bg-teal-100" onClick={() => setPointDialog({ open: true, companyId: p.companies.id, companyName: p.name, actionType: 'deduct', currency: 'booking_points' })}>
                                                                <Minus className="w-3 h-3 mr-0.5" />예약P 차감
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs" 
                                                    onClick={() => handleDeletePartner(p.id, p.name)} 
                                                    disabled={isUpdating}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                    탈퇴
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </CardContent>
        </Card>

        {/* 포인트 관리 다이얼로그 */}
        <Dialog open={pointDialog.open} onOpenChange={(open) => !open && setPointDialog({ ...pointDialog, open: false })}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{pointDialog.currency === 'booking_points' ? '예약 할인 포인트 ' : '활동 포인트 '}{pointDialog.actionType === 'add' ? '지급' : '차감'}</DialogTitle>
                    <DialogDescription>
                        {pointDialog.companyName} 파트너에게 전용 {pointDialog.currency === 'booking_points' ? '예약 할인 포인트' : '활동 포인트'}를 {pointDialog.actionType === 'add' ? '지급' : '차감'}합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>{pointDialog.currency === 'booking_points' ? '예약 할인 포인트 금액' : '활동 포인트 금액'}</Label>
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
                        {pointDialog.actionType === 'add' ? '지급하기' : '차감하기'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* 혜택 설정 다이얼로그 */}
        <Dialog open={benefitsDialog.open} onOpenChange={(open) => !open && setBenefitsDialog({ ...benefitsDialog, open: false })}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Gift className="w-5 h-5 text-amber-500" /> 파트너 전용 특별 혜택 설정
                    </DialogTitle>
                    <DialogDescription>
                        <strong className="text-slate-800">{benefitsDialog.companyName}</strong> 파트너가 의뢰 시 무상으로 적용받을 수 있는 혜택을 설정합니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                            <Label className="text-base font-bold text-slate-800">구축 할증 무상 혜택</Label>
                            <p className="text-sm text-slate-500 mt-1">의뢰 시 건물 상태를 구축으로 선택해도 2,000원 추가 할증이 붙지 않습니다.</p>
                        </div>
                        <Switch
                            checked={!!benefitsDialog.benefits?.free_old_building}
                            onCheckedChange={(c) => setBenefitsDialog(prev => ({ ...prev, benefits: { ...prev.benefits, free_old_building: c }}))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                            <Label className="text-base font-bold text-slate-800">인테리어 할증 무상 혜택</Label>
                            <p className="text-sm text-slate-500 mt-1">의뢰 시 건물 상태를 인테리어 후로 선택해도 4,000원 추가 할증이 붙지 않습니다.</p>
                        </div>
                        <Switch
                            checked={!!benefitsDialog.benefits?.free_interior}
                            onCheckedChange={(c) => setBenefitsDialog(prev => ({ ...prev, benefits: { ...prev.benefits, free_interior: c }}))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                        <div>
                            <Label className="text-base font-bold text-amber-900">피톤치드 100% 무상 시공</Label>
                            <p className="text-sm text-amber-700/80 mt-1">이 혜택이 켜져있으면, 작업 현장에 전구역 피톤치드 무상 시공이 자동 포함됩니다.</p>
                        </div>
                        <Switch
                            checked={!!benefitsDialog.benefits?.free_phytoncide}
                            onCheckedChange={(c) => setBenefitsDialog(prev => ({ ...prev, benefits: { ...prev.benefits, free_phytoncide: c }}))}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setBenefitsDialog({ ...benefitsDialog, open: false })}>취소</Button>
                    <Button
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={handleBenefitsUpdate}
                        disabled={isUpdating}
                    >
                        {isUpdating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        혜택 저장
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}

