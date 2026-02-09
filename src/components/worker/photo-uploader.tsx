/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useEffect } from 'react'
import { uploadPhoto, deletePhoto } from '@/actions/worker'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Camera, Upload, Loader2, Image as ImageIcon, X, ZoomIn, ChevronLeft, ChevronRight, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface PhotoUploaderProps {
    siteId: string
    existingPhotos: any[]
    readOnly?: boolean
}

export function PhotoUploader({ siteId, existingPhotos, readOnly = false }: PhotoUploaderProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [tab, setTab] = useState<'before' | 'during' | 'after' | 'special'>('before')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

    // Back button handling
    useEffect(() => {
        if (selectedPhotoIndex !== null) {
            // Modal opened: push state
            window.history.pushState({ modalOpen: true }, '', '')

            const handlePopState = () => {
                // Back button pressed: close modal
                setSelectedPhotoIndex(null)
            }

            window.addEventListener('popstate', handlePopState)

            return () => {
                window.removeEventListener('popstate', handlePopState)
            }
        }
    }, [selectedPhotoIndex])

    // Manual close handler (e.g. clicking outside)
    const handleManualClose = (open: boolean) => {
        if (!open && selectedPhotoIndex !== null) {
            window.history.back()
        }
    }

    const currentPhotos = existingPhotos.filter(p => p.type === tab)

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (readOnly) return
        const files = event.target.files
        if (!files || files.length === 0) return

        setIsUploading(true)
        let successCount = 0
        let failCount = 0

        try {
            const { compressImage } = await import('@/lib/utils/image-compression')

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                try {
                    const compressedFile = await compressImage(file)

                    const formData = new FormData()
                    formData.append('file', compressedFile)
                    formData.append('siteId', siteId)
                    formData.append('type', tab)

                    const result = await uploadPhoto(formData)

                    if (!result.success) {
                        throw new Error(result.error || '업로드 실패')
                    }
                    successCount++
                } catch (error) {
                    console.error(`File ${file.name} upload failed:`, error)
                    failCount++
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount}장의 사진이 업로드되었습니다.`)
                router.refresh()
            }
            if (failCount > 0) {
                toast.error(`${failCount}장의 사진 업로드에 실패했습니다.`)
            }

            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (error) {
            toast.error('업로드 중 오류 발생', { description: (error as Error).message })
        } finally {
            setIsUploading(false)
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
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                ) : (
                                    <Upload className="h-5 w-5 text-primary" />
                                )}
                                <span className="font-medium">{isUploading ? '업로드 중...' : '사진 추가하기 (여러 장 가능)'}</span>
                            </Button>
                        </>
                    )}

                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {currentPhotos.length === 0 ? (
                            <div className="col-span-3 lg:col-span-5 py-8 text-center text-slate-400 bg-slate-50 rounded text-sm flex flex-col items-center justify-center">
                                <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                                등록된 사진이 없습니다.
                            </div>
                        ) : (
                            currentPhotos.map((photo, index) => (
                                <div
                                    key={photo.id}
                                    className="relative aspect-square rounded-lg overflow-hidden border bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity group"
                                    onClick={() => setSelectedPhotoIndex(index)}
                                >
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
                                    <a
                                        href={photo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded z-10 hover:bg-black/70"
                                    >
                                        Raw
                                    </a>
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

                            {/* Action Buttons (Top Right) */}
                            <div className="absolute top-4 right-4 z-50 flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="rounded-full shadow-lg bg-white/90 hover:bg-white"
                                    onClick={(e) => { e.stopPropagation(); handleDownloadAll(); }}
                                    disabled={isDownloading}
                                    title="전체 다운로드"
                                >
                                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-700" />}
                                </Button>

                                {!readOnly && (
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


                            <div className="relative w-full h-full bg-black/80 rounded-lg overflow-hidden flex items-center justify-center">
                                <Image
                                    src={currentPhotos[selectedPhotoIndex].url}
                                    alt="Enlarged photo"
                                    fill
                                    className="object-contain"
                                    priority
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
