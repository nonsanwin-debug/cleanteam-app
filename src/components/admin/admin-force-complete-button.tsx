'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { forceCompleteSite } from '@/actions/sites'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface AdminForceCompleteButtonProps {
    siteId: string
    siteName: string
}

export function AdminForceCompleteButton({ siteId, siteName }: AdminForceCompleteButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleForceComplete() {
        setLoading(true)
        try {
            const result = await forceCompleteSite(siteId)
            if (result.success) {
                toast.success('현장이 완료 처리되었습니다.')
                router.refresh()
            } else {
                toast.error(result.error || '완료 처리 중 오류가 발생했습니다.')
            }
        } catch (error) {
            toast.error('완료 처리 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="w-full mt-4" variant="default">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    강제 작업 완료 처리
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>강제 작업 완료</AlertDialogTitle>
                    <AlertDialogDescription>
                        &quot;{siteName}&quot; 현장을 강제로 완료 처리하시겠습니까?<br />
                        고객의 서명 없이도 즉시 '완료' 상태로 변경됩니다.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleForceComplete()
                        }}
                        disabled={loading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                처리 중...
                            </>
                        ) : (
                            '네, 완료 처리합니다'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
