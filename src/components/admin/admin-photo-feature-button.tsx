'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { togglePhotoFeatured } from '@/actions/admin'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function AdminPhotoFeatureButton({ photoId, isFeatured, currentFeaturedCount }: { photoId: string; isFeatured: boolean; currentFeaturedCount: number }) {
    const [isToggling, setIsToggling] = useState(false)
    const router = useRouter()

    async function handleToggle(e: React.MouseEvent) {
        e.stopPropagation()
        e.preventDefault()

        if (!isFeatured && currentFeaturedCount >= 4) {
            toast.error('대표 사진은 각 탭별로 최대 4장까지만 설정할 수 있습니다.')
            return
        }

        setIsToggling(true)
        try {
            const result = await togglePhotoFeatured(photoId, !isFeatured)
            if (!result.success) throw new Error(result.error)

            toast.success(isFeatured ? '대표 사진에서 해제되었습니다.' : '대표 사진으로 설정되었습니다.')
            router.refresh()
        } catch (error: any) {
            toast.error('설정 실패', { description: error.message })
        } finally {
            setIsToggling(false)
        }
    }

    return (
        <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`absolute top-2 right-10 z-20 p-1.5 rounded-full shadow-md transition-colors ${isFeatured ? 'bg-yellow-400 text-white' : 'bg-black/40 text-white/90 hover:bg-black/60'
                } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isFeatured ? "포트폴리오 대표 사진 해제" : "포트폴리오 대표 사진으로 설정 (최대 4장)"}
        >
            {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className={`h-4 w-4 ${isFeatured ? 'fill-current text-white outline-none' : ''}`} />}
        </button>
    )
}
