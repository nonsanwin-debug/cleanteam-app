'use client'

import { useState } from 'react'
import { MoreHorizontal, Trash2, Edit, Share2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteSite, type Site } from '@/actions/sites'
import { toast } from 'sonner'
import { SiteDialog } from './site-dialog'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { searchCompanyByCode, shareSiteDirectly, reclaimSharedOrder } from '@/actions/shared-orders'

interface SiteActionsProps {
    site: Site & { is_shared_out?: boolean; shared_info?: any; received_info?: any }
    workers: { id: string; name: string | null }[]
}

export function SiteActions({ site, workers }: SiteActionsProps) {
    const router = useRouter()
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [open, setOpen] = useState(false)

    // Direct Order Share States
    const [showShareDialog, setShowShareDialog] = useState(false)
    const [partnerCode, setPartnerCode] = useState('')
    const [isValidating, setIsValidating] = useState(false)
    const [validatedCompany, setValidatedCompany] = useState<{ id: string; name: string; code: string } | null>(null)
    const [shareNotes, setShareNotes] = useState('')
    const [isSharing, setIsSharing] = useState(false)
    const [isReclaiming, setIsReclaiming] = useState(false)

    async function handleValidateCompany() {
        if (!partnerCode) return
        setIsValidating(true)
        try {
            const result = await searchCompanyByCode(partnerCode)
            if (result.found && result.companies && result.companies.length > 0) {
                const comp = result.companies[0]
                setValidatedCompany({
                    id: comp.id,
                    name: comp.name || '',
                    code: comp.code || ''
                })
                toast.success('파트너사가 매칭되었습니다.')
            } else {
                toast.error(result.error || '업체를 찾을 수 없습니다.')
                setValidatedCompany(null)
            }
        } catch (error) {
            toast.error('검증 중 오류가 발생했습니다.')
            console.error(error)
        } finally {
            setIsValidating(false)
        }
    }

    async function handleDirectShare() {
        if (!validatedCompany) return
        setIsSharing(true)
        try {
            const result = await shareSiteDirectly(site.id, validatedCompany.id, shareNotes)
            if (result.success) {
                toast.success('성공적으로 오더를 공유(이관)하였습니다.')
                handleCloseShareDialog()
                router.refresh()
                setTimeout(() => {
                    window.location.reload()
                }, 500)
            } else {
                toast.error(result.error || '오더 공유에 실패했습니다.')
            }
        } catch (error) {
            toast.error('공유 중 오류가 발생했습니다.')
            console.error(error)
        } finally {
            setIsSharing(false)
        }
    }

    function handleCloseShareDialog() {
        setShowShareDialog(false)
        setPartnerCode('')
        setValidatedCompany(null)
        setShareNotes('')
    }

    async function handleReclaimSite() {
        const orderId = site.shared_info?.id
        if (!orderId) {
            toast.error('회수할 공유 오더 ID를 찾을 수 없습니다.')
            return
        }

        const isAlreadyAccepted = site.shared_info?.status === 'transferred' || site.shared_info?.status === 'pending'
        const confirmMessage = isAlreadyAccepted
            ? '이미 파트너사가 수락한 오더입니다. 회수를 요청하시겠습니까?\n요청 시 파트너사의 동의를 받아 회수 처리가 완료됩니다.'
            : '이 공유 오더를 즉시 회수하시겠습니까?'

        if (!confirm(confirmMessage)) return

        setIsReclaiming(true)
        try {
            const result = await reclaimSharedOrder(orderId)
            if (result.success) {
                if (isAlreadyAccepted) {
                    toast.success('성공적으로 오더 회수 요청을 접수했습니다.')
                } else {
                    toast.success('오더가 정상적으로 회수되었습니다.')
                }
                router.refresh()
                setTimeout(() => {
                    window.location.reload()
                }, 500)
            } else {
                toast.error(result.error || '오더 회수에 실패했습니다.')
            }
        } catch (error) {
            toast.error('회수 처리 중 오류가 발생했습니다.')
        } finally {
            setIsReclaiming(false)
        }
    }

    async function handleDelete() {
        setIsDeleting(true)
        try {
            const result = await deleteSite(site.id)

            if (!result.success) {
                toast.error(result.error || '삭제에 실패했습니다.')
                return
            }

            toast.success('현장이 삭제되었습니다.')
            setShowDeleteAlert(false)
            setOpen(false)
            router.refresh()

            // Force hard reload if router.refresh() is not enough
            setTimeout(() => {
                window.location.reload()
            }, 500)
        } catch (error) {
            toast.error('삭제 중 오류가 발생했습니다.')
            console.error(error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">메뉴 열기</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>관리</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => {
                            if (site.is_shared_out) return
                            setOpen(false)
                            setShowEditDialog(true)
                        }}
                        className={`cursor-pointer ${site.is_shared_out ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={site.is_shared_out}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        수정하기 {site.is_shared_out && '(공유됨)'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            if (site.is_shared_out) return
                            setShowDeleteAlert(true)
                        }}
                        className={`text-red-600 cursor-pointer focus:text-red-600 ${site.is_shared_out ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={site.is_shared_out}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제하기 {site.is_shared_out && '(공유됨)'}
                    </DropdownMenuItem>
                    {!site.is_shared_out && 
                    (!site.shared_info || site.shared_info.status === 'cancelled' || site.shared_info.status === 'reclaimed') && 
                    (!site.received_info || site.received_info.status === 'cancelled' || site.received_info.status === 'reclaimed') && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setOpen(false)
                                    setShowShareDialog(true)
                                }}
                                className="cursor-pointer text-blue-600 focus:text-blue-600"
                            >
                                <Share2 className="mr-2 h-4 w-4" />
                                오더 공유
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <SiteDialog
                workers={workers}
                mode="update"
                siteId={site.id}
                initialData={{
                    name: site.name,
                    address: site.address,
                    worker_id: site.worker_id,
                    customer_name: site.customer_name,
                    customer_phone: site.customer_phone,
                    residential_type: site.residential_type,
                    area_size: site.area_size,
                    structure_type: site.structure_type,
                    cleaning_date: site.cleaning_date,
                    start_time: site.start_time,
                    special_notes: site.special_notes,
                    balance_amount: site.balance_amount,
                    additional_amount: site.additional_amount,
                    additional_description: site.additional_description,
                    collection_type: site.collection_type,
                }}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
            />

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            정말 삭제하시겠습니까?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>&quot;{site.name}&quot; 현장이 삭제됩니다.</p>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-red-800 text-sm space-y-2 text-left">
                                    <p className="font-bold text-center">⚠️ 주의사항</p>
                                    <p className="leading-relaxed">• 진행중인 현장을 삭제 시<br />&nbsp;&nbsp;서버에서도 삭제 됩니다 ( 복구 불가 )</p>
                                    <p className="leading-relaxed">• 해당 현장이 공유받은 현장일 경우<br />&nbsp;&nbsp;현장을 공유한 업체로 회수 됩니다<br />&nbsp;&nbsp;( 공유업체 삭제 불가 )</p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? '삭제 중...' : '삭제 확인'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 오더 공유 다이얼로그 */}
            <Dialog open={showShareDialog} onOpenChange={(open) => { if (!open) handleCloseShareDialog(); else setShowShareDialog(true); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-600" />
                            파트너사 직접 오더 공유
                        </DialogTitle>
                        <DialogDescription>
                            업체명#코드명(4자리 숫자) 형식으로 파트너사를 검색하여 오더를 직접 이관(공유)할 수 있습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="flex gap-2">
                            <Input
                                placeholder="예: 클린체크#1234"
                                value={partnerCode}
                                onChange={(e) => {
                                    setPartnerCode(e.target.value)
                                    setValidatedCompany(null)
                                }}
                                disabled={isValidating || isSharing}
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleValidateCompany}
                                disabled={!partnerCode.includes('#') || isValidating || isSharing}
                            >
                                {isValidating ? '검증 중...' : '검증'}
                            </Button>
                        </div>

                        {validatedCompany && (
                            <div className="space-y-3">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900 text-sm flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">✅ 매칭 파트너사 확인</p>
                                        <p className="text-xs text-blue-700 mt-0.5">
                                            업체명: <span className="font-bold">{validatedCompany.name}</span> (#{validatedCompany.code})
                                        </p>
                                    </div>
                                    <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        매칭됨
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="share-notes" className="text-xs font-semibold text-slate-600">공유 요청사항 (선택)</Label>
                                    <Textarea
                                        id="share-notes"
                                        placeholder="파트너사에게 전달할 요청사항이나 특이사항을 적어주세요."
                                        value={shareNotes}
                                        onChange={(e) => setShareNotes(e.target.value)}
                                        rows={3}
                                        className="text-xs"
                                        disabled={isSharing}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 text-xs space-y-1.5 leading-relaxed">
                            <p className="font-semibold text-slate-800">📌 공유 시 통제 규칙 및 동의</p>
                            <p>• 이관 완료 시 파트너사 소속으로 새로운 현장이 생성됩니다.</p>
                            <p>• 발신사(나)의 목록에는 원래 카드가 <span className="font-bold text-orange-600">읽기 전용</span>으로 보존됩니다.</p>
                            <p>• 읽기 전용 전환 후에는 <span className="font-semibold">팀원 배정, 삭제, 수정, 채팅 참여</span>가 모두 엄격히 차단됩니다.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleCloseShareDialog}
                            disabled={isSharing}
                        >
                            취소
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDirectShare}
                            disabled={!validatedCompany || isSharing}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSharing ? '공유 중...' : '공유하기'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
