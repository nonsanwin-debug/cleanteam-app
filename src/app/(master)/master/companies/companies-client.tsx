'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { updateCompanyStatus, manageCompanyPoints, updateCompanyRegionAndBadges, toggleCompanyAlias } from '@/actions/master'
import { createMasterNotice } from '@/actions/inquiries'
import { RefreshCw, CheckCircle, XCircle, Plus, Minus, Building2, MessageSquarePlus, Send, Settings, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { REGIONS } from '@/lib/regions'

export function MasterCompaniesClient({ initialCompanies }: { initialCompanies: any[] }) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)
    const [pointDialog, setPointDialog] = useState<{ open: boolean, companyId: string, companyName: string, actionType: 'add' | 'deduct', currency: 'points' | 'cash' }>({
        open: false, companyId: '', companyName: '', actionType: 'add', currency: 'points'
    })
    const [pointAmount, setPointAmount] = useState<string>('')

    const [messageDialog, setMessageDialog] = useState<{ open: boolean, companyId: string, companyName: string }>({
        open: false, companyId: '', companyName: ''
    })
    const [messageContent, setMessageContent] = useState<string>('')

    const [regionDialog, setRegionDialog] = useState<{ open: boolean, company: any }>({ open: false, company: null })
    const [compData, setCompData] = useState<any>({
        region_province: '',
        region_city: '',
        is_national: false,
        badge_business: false,
        badge_excellent: false,
        badge_aftercare: false,
        expose_partner_orders: true,
    })

    const openRegionDialog = (company: any) => {
        setCompData({
            region_province: company.region_province || '',
            region_city: company.region_city || '',
            is_national: company.is_national || false,
            badge_business: company.badge_business || false,
            badge_excellent: company.badge_excellent || false,
            badge_aftercare: company.badge_aftercare || false,
            expose_partner_orders: company.expose_partner_orders ?? true,
        })
        setRegionDialog({ open: true, company })
    }

    const handleSaveRegionSettings = async () => {
        if (!regionDialog.company) return
        setIsUpdating(true)
        const result = await updateCompanyRegionAndBadges(regionDialog.company.id, compData)
        setIsUpdating(false)
        if (result.success) {
            alert('업체 설정이 저장되었습니다.')
            setRegionDialog({ open: false, company: null })
            router.refresh()
        } else {
            alert(result.error || '오류가 발생했습니다.')
        }
    }

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
        const result = await manageCompanyPoints(pointDialog.companyId, amount, pointDialog.actionType, pointDialog.currency)
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
                                    <th className="p-4 font-medium text-slate-500 w-[50px] text-center">별명</th>
                                    <th className="p-4 font-medium text-slate-500 w-[120px]">코드</th>
                                    <th className="p-4 font-medium text-slate-500 w-[200px]">업체명</th>
                                    <th className="p-4 font-medium text-slate-500 w-[100px]">상태</th>
                                    <th className="p-4 font-medium text-slate-500 w-[150px]">잔여 포인트</th>
                                    <th className="p-4 font-medium text-slate-500 w-[150px]">보유 캐쉬</th>
                                    <th className="p-4 font-medium text-slate-500 w-[150px]">가입일</th>
                                    <th className="p-4 font-medium text-slate-500 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {initialCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-center">
                                            <Checkbox
                                                checked={company.use_alias_name || false}
                                                onCheckedChange={async (checked) => {
                                                    const result = await toggleCompanyAlias(company.id, !!checked)
                                                    if (result.success) router.refresh()
                                                    else alert(result.error)
                                                }}
                                            />
                                        </td>
                                        <td className="p-4 font-mono text-slate-600">{company.code || '-'}</td>
                                        <td className="p-4 font-medium text-slate-900">{company.name}</td>
                                        <td className="p-4">
                                            {company.status === 'pending' && <Badge variant="outline" className="text-amber-600 bg-amber-50 mr-1">승인 대기</Badge>}
                                            {company.status === 'approved' && <Badge variant="outline" className="text-indigo-600 bg-indigo-50 mr-1">승인 완료</Badge>}
                                            {company.status === 'rejected' && <Badge variant="outline" className="text-red-600 bg-red-50 mr-1">가입 반려</Badge>}
                                            {(!company.status || company.status === 'deleted') && <Badge variant="outline" className="text-slate-600 bg-slate-50 mr-1">비활성</Badge>}
                                            {company.is_national && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none mr-1">전국</Badge>}
                                            {company.badge_business && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none mr-1">사업자 인증</Badge>}
                                            {company.badge_excellent && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none mr-1">우수업체</Badge>}
                                            {company.badge_aftercare && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">사후관리</Badge>}
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">
                                            {company.points?.toLocaleString() || 0} P
                                        </td>
                                        <td className="p-4 font-bold text-emerald-600">
                                            {company.cash?.toLocaleString() || 0} C
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
                                                        <Button size="sm" variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => setPointDialog({ open: true, companyId: company.id, companyName: company.name, actionType: 'add', currency: 'points' })}>
                                                            <Plus className="w-4 h-4 mr-1" />
                                                            지급
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setPointDialog({ open: true, companyId: company.id, companyName: company.name, actionType: 'deduct', currency: 'points' })}>
                                                            <Minus className="w-4 h-4 mr-1" />
                                                            차감
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => setMessageDialog({ open: true, companyId: company.id, companyName: company.name })}>
                                                            <MessageSquarePlus className="w-4 h-4 mr-1" />
                                                            메시지 발송
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100" onClick={() => openRegionDialog(company)}>
                                                            <Settings className="w-4 h-4 mr-1" />
                                                            권한/지역
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
                                        <td colSpan={8} className="p-8 text-center text-slate-500">
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
                        <DialogTitle>{pointDialog.actionType === 'add' ? '캐쉬/포인트 지급(충전)' : '캐쉬/포인트 차감(환수)'}</DialogTitle>
                        <DialogDescription>
                            {pointDialog.companyName} 업체에 캐쉬 또는 관리포인트를 {pointDialog.actionType === 'add' ? '지급' : '차감'}합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label>항목 선택</Label>
                            <RadioGroup 
                                value={pointDialog.currency} 
                                onValueChange={(val: 'points' | 'cash') => setPointDialog({ ...pointDialog, currency: val })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="points" id="r1" />
                                    <Label htmlFor="r1">관리포인트 (P)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="cash" id="r2" />
                                    <Label htmlFor="r2">캐쉬 (C)</Label>
                                </div>
                            </RadioGroup>
                        </div>

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
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    {pointDialog.currency === 'points' ? 'P' : 'C'}
                                </span>
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

            <Dialog open={regionDialog.open} onOpenChange={(open) => !open && setRegionDialog({ open: false, company: null })}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>업체 권한 및 뱃지 설정</DialogTitle>
                        <DialogDescription>
                            {regionDialog.company?.name} 업체의 권한, 지역 및 신뢰도 관련 정보(뱃지)를 설정합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <section className="space-y-4">
                            <h3 className="font-semibold text-slate-800 border-b pb-2">지역/권한 설정</h3>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="is_national" checked={compData.is_national} onCheckedChange={(c) => setCompData((p:any) => ({ ...p, is_national: !!c }))} />
                                <Label htmlFor="is_national" className="font-bold text-indigo-700">전국 지역 권한 부여 (모든 지역 오더 보기)</Label>
                            </div>

                            <div className="grid grid-cols-2 gap-2 opacity-100 transition-opacity" style={{ opacity: compData.is_national ? 0.5 : 1 }}>
                                <div className="space-y-2">
                                    <Label htmlFor="rp">지역 (도)</Label>
                                    <select 
                                        id="rp"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={compData.region_province}
                                        disabled={compData.is_national}
                                        onChange={(e) => setCompData((p:any) => ({ ...p, region_province: e.target.value, region_city: '' }))}
                                    >
                                        <option value="">시/도 선택</option>
                                        {Object.keys(REGIONS).map((prov) => (
                                            <option key={prov} value={prov}>{prov}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rc">지역 (시/군/구)</Label>
                                    <select 
                                        id="rc"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={compData.region_city}
                                        disabled={compData.is_national || !compData.region_province}
                                        onChange={(e) => setCompData((p:any) => ({ ...p, region_city: e.target.value }))}
                                    >
                                        <option value="">시/군/구 선택</option>
                                        {compData.region_province && (REGIONS as any)[compData.region_province]?.map((city: string) => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>
                        
                        <section className="space-y-4">
                            <h3 className="font-semibold text-slate-800 border-b pb-2">신뢰도 뱃지 부여</h3>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="bb" checked={compData.badge_business} onCheckedChange={(c) => setCompData((p:any) => ({ ...p, badge_business: !!c }))} />
                                    <Label htmlFor="bb" className="font-medium text-slate-700">인증 마크 - '사업자 인증 완료 업체'</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="be" checked={compData.badge_excellent} onCheckedChange={(c) => setCompData((p:any) => ({ ...p, badge_excellent: !!c }))} />
                                    <Label htmlFor="be" className="font-medium text-slate-700">인증 마크 - 'NEXUS 우수업체'</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="ba" checked={compData.badge_aftercare} onCheckedChange={(c) => setCompData((p:any) => ({ ...p, badge_aftercare: !!c }))} />
                                    <Label htmlFor="ba" className="font-medium text-slate-700">인증 마크 - '사후관리 100%'</Label>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="font-semibold text-slate-800 border-b pb-2">기타 권한 설정</h3>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="epo" checked={compData.expose_partner_orders} onCheckedChange={(c) => setCompData((p:any) => ({ ...p, expose_partner_orders: !!c }))} />
                                <Label htmlFor="epo" className="font-medium text-slate-700">오더 공유 마켓(게시판) 열람 권한</Label>
                            </div>
                            <p className="text-xs text-slate-500 pl-6">체크 해제 시 해당 청소업체는 파트너들이 올린 공유 오더를 볼 수 없습니다.</p>
                        </section>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRegionDialog({ open: false, company: null })}>취소</Button>
                        <Button
                            className="bg-slate-800 hover:bg-slate-900 text-white"
                            onClick={handleSaveRegionSettings}
                            disabled={isUpdating}
                        >
                            {isUpdating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                            설정 적용하기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
