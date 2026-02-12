'use client'

import { useState } from 'react'
import { MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
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

interface SiteActionsProps {
    site: Site
    workers: { id: string; name: string | null }[]
}

export function SiteActions({ site, workers }: SiteActionsProps) {
    const router = useRouter()
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [open, setOpen] = useState(false)

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
                            setOpen(false)
                            setShowEditDialog(true)
                        }}
                        className="cursor-pointer"
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        수정하기
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setShowDeleteAlert(true)}
                        className="text-red-600 cursor-pointer focus:text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제하기
                    </DropdownMenuItem>
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
                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &quot;{site.name}&quot; 현장이 영구적으로 삭제됩니다.<br />
                            관련된 사진이나 체크리스트 기록도 함께 삭제될 수 있습니다.
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
        </>
    )
}
