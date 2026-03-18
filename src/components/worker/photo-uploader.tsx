/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useEffect, TouchEvent } from 'react'
import { deletePhoto } from '@/actions/worker'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Camera, Upload, Loader2, Image as ImageIcon, X, ZoomIn, ChevronLeft, ChevronRight, Trash2, Download, Star, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { togglePhotoFeatured } from '@/actions/admin'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { uploadManager } from '@/lib/upload-manager'

interface PhotoUploaderProps {
    siteId: string
    existingPhotos: any[]
    readOnly?: boolean
    canDelete?: boolean
    showFeatureToggle?: boolean
}

export function PhotoUploader({ siteId, existingPhotos, readOnly = false, canDelete = false, showFeatureToggle = false }: PhotoUploaderProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [tab, setTab] = useState<'before' | 'during' | 'after' | 'special'>('before')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEndEvent = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        if (isLeftSwipe) {
            handleNext()
        } else if (isRightSwipe) {
            handlePrev()
        }
    }

    // Back button handling
    useEffect(() => {
        if (selectedPhotoIndex !== null) {
            window.history.pushState({ modalOpen: true }, '', '')

            const handlePopState = () => {
                setSelectedPhotoIndex(null)
            }

            window.addEventListener('popstate', handlePopState)

            return () => {
                window.removeEventListener('popstate', handlePopState)
            }
        }
    }, [selectedPhotoIndex])

    const handleManualClose = (open: boolean) => {
        if (!open && selectedPhotoIndex !== null) {
            window.history.back()
        }
    }

    const currentPhotos = existingPhotos.filter(p => p.type === tab)

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (readOnly) return
        const files = event.target.files
        if (!files || files.length === 0) return

        // 업로드 매니저에 위임 → 백그라운드 처리, 다른 화면 이동 가능
        const fileArray = Array.from(files)
        uploadManager.addFiles(fileArray, siteId, tab)
        toast.success(`${fileArray.length}장의 사진 업로드를 시작합니다.`, {
            description: '다른 화면으로 이동해도 업로드가 계속됩니다.'
        })

        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function handleToggleFeature(photo: any) {
        if (!showFeatureToggle) return

        // If trying to feature, check limit (max 4 per tab)
        if (!photo.is_featured) {
            const featuredCount = currentPhotos.filter(p => p.is_featured).length
            if (featuredCount >= 4) {
                toast.error('대표 사진은 각 탭별로 최대 4장까지만 설정할 수 있습니다.')
                return
            }
        }

        try {
            // Optimistic UI update could be added here, but for simplicity we rely on router.refresh
            const result = await togglePhotoFeatured(photo.id, !photo.is_featured)
            if (!result.success) throw new Error(result.error)

            toast.success(photo.is_featured ? '대표 사진에서 해제되었습니다.' : '대표 사진으로 설정되었습니다.')
            router.refresh()
        } catch (error: any) {
            toast.error('설정 실패', { description: error.message })
        }
    }

    async function handleDelete(photo: any) {
        if (readOnly) return
        if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) return

        setIsDeleting(true)
        try {
            const result = await deletePhoto(photo.id, photo.url, siteId)
            if (!result.success) throw new Error(result.error)

            toast.success('사진이 삭제되었습니다.')
            window.history.back()
            router.refresh()
        } catch (error) {
            toast.error('삭제 실패', { description: (error as Error).message })
        } finally {
            setIsDeleting(false)
        }
    }

    async function handleDownloadAll() {
        if (currentPhotos.length === 0) {
            toast.error('다운로드할 사진이 없습니다.')
            return
        }

        setIsDownloading(true)
        try {
            const zip = new JSZip()
            const folder = zip.folder(tab) // 'before', 'during', 'after', 'special'

            let downloadedCount = 0

            const promises = currentPhotos.map(async (photo, index) => {
                try {
                    const response = await fetch(photo.url)
                    if (!response.ok) throw new Error('Fetch failed')
                    const blob = await response.blob()

                    let extension = 'jpg'
                    if (blob.type === 'image/png') extension = 'png'
                    else if (blob.type === 'image/jpeg') extension = 'jpg'

                    const filename = `${tab}_${index + 1}.${extension}`

                    folder?.file(filename, blob)
                    downloadedCount++
                } catch (e) {
                    console.error('Download failed for', photo.url, e)
                }
            })

            await Promise.all(promises)

            if (downloadedCount === 0) {
                throw new Error('사진을 다운로드할 수 없습니다.')
            }

            const content = await zip.generateAsync({ type: 'blob' })
            saveAs(content, `${siteId}_${tab}_photos.zip`)
            toast.success(`${downloadedCount}장의 사진을 다운로드했습니다.`)

        } catch (error) {
            console.error('Download all error:', error)
            toast.error('다운로드 실패', { description: (error as Error).message })
        } finally {
            setIsDownloading(false)
        }
    }

    function handlePrev() {
        if (selectedPhotoIndex === null) return
        setSelectedPhotoIndex(prev => (prev !== null && prev > 0 ? prev - 1 : currentPhotos.length - 1))
    }

    function handleNext() {
        if (selectedPhotoIndex === null) return
        setSelectedPhotoIndex(prev => (prev !== null && prev < currentPhotos.length - 1 ? prev + 1 : 0))
    }

    return (
        <div className="space-y-4">
            <Tabs defaultValue="before" onValueChange={(v) => {
                setTab(v as any)
                setSelectedPhotoIndex(null)
            }} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="before">작업 전</TabsTrigger>
                    <TabsTrigger value="during">작업 중</TabsTrigger>
                    <TabsTrigger value="after">작업 후</TabsTrigger>
                    <TabsTrigger value="special">특이사항</TabsTrigger>
                </TabsList>

                <div className="space-y-4">
                    {!readOnly && (
                        <>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            <Button
                                variant="outline"
                                className="h-16 w-full flex items-center justify-center gap-2 border-dashed border-2"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-5 w-5 text-primary" />
                                <span className="font-medium">사진 추가하기 (여러 장 가능)</span>
                            </Button>
                        </>
                    )}

                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {currentPhotos.length === 0 ? (
                            <div className="col-span-3 lg:col-span-5 py-16 mt-4 text-center text-slate-500 bg-slate-50/80 border border-slate-200 border-dashed rounded-xl text-sm flex flex-col items-center justify-center shadow-sm">
                                <div className="p-4 bg-blue-100/50 text-blue-500 rounded-full mb-4">
                                    <Sparkles className="h-8 w-8" />
                                </div>
                                <span className="font-bold text-slate-700 text-base mb-1">사진을 준비 중입니다</span>
                                <span className="text-slate-500">꼼꼼하게 청소하고 있어요. 잠시만 기다려 주세요!</span>
                            </div>
                        ) : (
                            currentPhotos.map((photo, index) => (
                                <div
                                    key={photo.id}
                                    className="relative aspect-square rounded-lg overflow-hidden border bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity group"
                                    onClick={() => setSelectedPhotoIndex(index)}
                                >
                                    {showFeatureToggle && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleFeature(photo); }}
                                            className={`absolute top-2 left-2 z-20 p-1.5 rounded-full shadow-sm transition-colors ${photo.is_featured ? 'bg-yellow-400 text-white' : 'bg-black/40 text-white/70 hover:bg-black/60'}`}
                                            title={photo.is_featured ? "포트폴리오 대표 사진 해제" : "포트폴리오 대표 사진으로 설정 (최대 4장)"}
                                        >
                                            <Star className={`w-4 h-4 ${photo.is_featured ? 'fill-current text-white outline-none' : ''}`} />
                                        </button>
                                    )}
                                    {/* Debugging: Use standard img tag to bypass Next.js Image Optimization */}
                                    <img
                                        src={photo.url}
                                        alt="Work photo"
                                        className="object-cover w-full h-full"
                                    />
                                    {/* <Image
                                        src={photo.url}
                                        alt="Work photo"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 15vw"
                                    /> */}

                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                                        <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-6 h-6" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Tabs>

            <Dialog open={selectedPhotoIndex !== null} onOpenChange={handleManualClose}>
                <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none shadow-none focus:outline-none flex items-center justify-center h-[90vh]" aria-describedby="photo-description">
                    <div id="photo-title" className="sr-only">사진 상세 보기</div>
                    <div id="photo-description" className="sr-only">선택된 사진의 상세 보기 화면입니다.</div>
                    {selectedPhotoIndex !== null && currentPhotos[selectedPhotoIndex] && (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                            {/* Navigation Buttons */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-50 text-white bg-black/30 hover:bg-black/50 rounded-full h-10 w-10 md:h-12 md:w-12"
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            >
                                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-50 text-white bg-black/30 hover:bg-black/50 rounded-full h-10 w-10 md:h-12 md:w-12"
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            >
                                <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
                            </Button>

                            {/* Close Button (Top Left) */}
                            <Button
                                variant="secondary"
                                className="absolute top-4 left-4 z-50 rounded-full shadow-lg bg-white/90 hover:bg-white text-slate-800 flex items-center gap-1.5 px-3"
                                onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }}
                            >
                                <X className="h-4 w-4" />
                                <span className="text-sm font-bold">닫기</span>
                            </Button>

                            {/* Action Buttons (Top Right) */}
                            <div className="absolute top-4 right-4 z-50 flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="rounded-full shadow-lg bg-white/90 hover:bg-white flex items-center gap-2 pr-4 pl-3"
                                    onClick={(e) => { e.stopPropagation(); handleDownloadAll(); }}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin text-slate-700" /> : <Download className="h-4 w-4 text-slate-700" />}
                                    <span className="text-sm font-bold text-slate-800">
                                        ({currentPhotos.length}) 묶음 다운로드
                                    </span>
                                </Button>

                                {canDelete && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="rounded-full shadow-lg"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(currentPhotos[selectedPhotoIndex]); }}
                                        disabled={isDeleting}
                                        title="현재 사진 삭제"
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>


                            <div
                                className="relative w-full h-full bg-black/80 rounded-lg overflow-hidden flex items-center justify-center"
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEndEvent}
                            >
                                <img
                                    src={currentPhotos[selectedPhotoIndex].url}
                                    alt="Enlarged photo"
                                    className="object-contain w-full h-full"
                                />
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full">
                                    {selectedPhotoIndex + 1} / {currentPhotos.length}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
