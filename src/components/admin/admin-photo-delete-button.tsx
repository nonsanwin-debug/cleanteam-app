'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deletePhoto } from '@/actions/worker'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function AdminPhotoDeleteButton({ photoId, photoUrl, siteId }: { photoId: string; photoUrl: string; siteId: string }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    async function handleDelete(e: React.MouseEvent) {
        e.stopPropagation()
        e.preventDefault()
        if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) return

        setIsDeleting(true)
        try {
            const result = await deletePhoto(photoId, photoUrl, siteId)
            if (!result.success) throw new Error(result.error)
            toast.success('사진이 삭제되었습니다.')
            router.refresh()
        } catch (error) {
            toast.error('삭제 실패', { description: (error as Error).message })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            title="사진 삭제"
        >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
    )
}
