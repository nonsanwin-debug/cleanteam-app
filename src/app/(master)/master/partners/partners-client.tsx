'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { deleteUserForce } from '@/actions/master'
import { Trash2, Building2, Search, PlusCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function MasterPartnersClient({ initialPartners }: { initialPartners: any[] }) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Create Partner State
    const [createOpen, setCreateOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [partnerName, setPartnerName] = useState('')
    const [partnerPhone, setPartnerPhone] = useState('')
    const [partnerEmail, setPartnerEmail] = useState('')
    const [partnerPassword, setPartnerPassword] = useState('')

    const supabase = createClient()

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
        if (!partnerName.trim() || !partnerEmail.trim() || !partnerPassword.trim()) {
            toast.error('이름, 이메일, 비밀번호를 모두 입력해주세요.')
            return
        }

        setSubmitting(true)
        try {
            // Use Supabase signup (Admin ideally, but auth.signUp works for creation if email confirm is off)
            // Notice: To create a user silently without logging in as them, we should use a server action or supabase admin.
            // But since this is client side, let's call a server action or just use a dedicated api.
            // For now, let's just use signup (which logs the master out... oops!)
            // We MUST use a server action using supabase admin.
            const { createPartnerAccount } = await import('@/actions/master-partner')
            const res = await createPartnerAccount(partnerName, partnerPhone, partnerEmail, partnerPassword)
            
            if (res.success) {
                toast.success('부동산 파트너 계정이 생성되었습니다.')
                setCreateOpen(false)
                setPartnerName('')
                setPartnerPhone('')
                setPartnerEmail('')
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
            (p.phone && p.phone.includes(lower)) ||
            (p.email && p.email.toLowerCase().includes(lower))
    })

    return (
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
                                <label className="text-sm font-medium">연락처</label>
                                <Input value={partnerPhone} onChange={e => setPartnerPhone(e.target.value)} placeholder="010-0000-0000" className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">로그인 이메일 (아이디) *</label>
                                <Input value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} placeholder="상호명@nexus.com 등" className="mt-1" />
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
                                <th className="p-3 font-semibold text-xs text-slate-600 w-[150px]">연락처</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 w-[200px]">이메일 (로그인 ID)</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 w-[180px]">가입일</th>
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
                                        <td className="p-4 py-3 text-slate-500 text-sm">{p.email || '-'}</td>
                                        <td className="p-4 py-3 text-slate-500 text-sm">{format(new Date(p.created_at), 'yyyy-MM-dd HH:mm')}</td>
                                        <td className="p-4 py-3 text-right">
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </CardContent>
        </Card>
    )
}
