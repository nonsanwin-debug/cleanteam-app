/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useEffect } from 'react'
import { insertPhotoRecord, deletePhoto } from '@/actions/worker'
import { createClient } from '@/lib/supabase/client'
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
import { v4 as uuidv4 } from 'uuid'

interface PhotoUploaderProps {
    siteId: string
    existingPhotos: any[]
    readOnly?: boolean
    canDelete?: boolean
}

// 재시도 유틸리티 (exponential backoff)
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error as Error
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt)
                await new Promise(r => setTimeout(r, delay))
            }
        }
    }
    throw lastError
}

interface UploadStatus {
    fileName: string
    status: 'compressing' | 'uploading' | 'done' | 'failed'
    error?: string
}

export function PhotoUploader({ siteId, existingPhotos, readOnly = false, canDelete = false }: PhotoUploaderProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [tab, setTab] = useState<'before' | 'during' | 'after' | 'special'>('before')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
    const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([])

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

    const [uploadProgress, setUploadProgress] = useState<string>('')

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (readOnly) return
        const files = event.target.files
        if (!files || files.length === 0) return

        setIsUploading(true)
        const fileArray = Array.from(files)
        let successCount = 0
        let failCount = 0

        // 개별 파일 상태 초기화
        const initialStatuses: UploadStatus[] = fileArray.map(f => ({
            fileName: f.name,
            status: 'compressing' as const,
        }))
        setUploadStatuses(initialStatuses)
        setUploadProgress(`압축 중... (0/${fileArray.length})`)

        try {
            const { compressImage } = await import('@/lib/utils/image-compression')
            const supabase = createClient()

            // 1단계: 모든 이미지를 먼저 압축 (3개씩 병렬)
            const compressed: File[] = []
            const batchSize = 3

            for (let i = 0; i < fileArray.length; i += batchSize) {
                const batch = fileArray.slice(i, i + batchSize)
                const results = await Promise.all(batch.map(f => compressImage(f)))
                compressed.push(...results)

                const doneCount = Math.min(i + batchSize, fileArray.length)
                setUploadProgress(`압축 중... (${doneCount}/${fileArray.length})`)

                // 상태 업데이트: 압축 완료 → 업로드 대기
                setUploadStatuses(prev => prev.map((s, idx) =>
                    idx < doneCount ? { ...s, status: 'uploading' } : s
                ))
            }

            // 2단계: 압축된 이미지를 클라이언트에서 직접 Supabase Storage 업로드 (3개씩)
            for (let i = 0; i < compressed.length; i += batchSize) {
                const batch = compressed.slice(i, i + batchSize)
                setUploadProgress(`업로드 중... (${i}/${compressed.length})`)

                const results = await Promise.all(
                    batch.map(async (file, batchIdx) => {
                        const globalIdx = i + batchIdx
                        try {
                            const fileName = `${siteId}/${tab}/${uuidv4()}-${file.name}`

                            // 클라이언트에서 Supabase Storage에 직접 업로드 (재시도 포함)
                            await withRetry(async () => {
                                const { error: uploadError } = await supabase
                                    .storage
                                    .from('site-photos')
                                    .upload(fileName, file, {
                                        contentType: 'image/jpeg',
                                        upsert: true,
                                    })
                                if (uploadError) throw uploadError
                            })

                            // Public URL 획득
                            const { data: { publicUrl } } = supabase
                                .storage
                                .from('site-photos')
                                .getPublicUrl(fileName)

                            // DB에 레코드 삽입 (Server Action - 경량)
                            const result = await insertPhotoRecord(siteId, publicUrl, tab)
                            if (!result.success) throw new Error(result.error || 'DB 저장 실패')

                            setUploadStatuses(prev => prev.map((s, idx) =>
                                idx === globalIdx ? { ...s, status: 'done' } : s
                            ))
                            return true
                        } catch (error) {
                            console.error(`Upload failed for file ${globalIdx}:`, error)
                            setUploadStatuses(prev => prev.map((s, idx) =>
                                idx === globalIdx
                                    ? { ...s, status: 'failed', error: (error as Error).message }
                                    : s
                            ))
                            return false
                        }
                    })
                )

                successCount += results.filter(Boolean).length
                failCount += results.filter(r => !r).length
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
            setUploadProgress('')
            // 3초 후 상태 클리어
            setTimeout(() => setUploadStatuses([]), 3000)
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
                                <span className="font-medium">{isUploading ? (uploadProgress || '처리 중...') : '사진 추가하기 (여러 장 가능)'}</span>
                            </Button>

                            {/* 개별 파일 업로드 상태 표시 */}
                            {uploadStatuses.length > 0 && (
                                <div className="space-y-1 text-xs">
                                    {uploadStatuses.map((s, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded bg-slate-50">
                                            {s.status === 'compressing' && <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />}
                                            {s.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin text-orange-500 shrink-0" />}
                                            {s.status === 'done' && <span className="text-green-500 shrink-0">✓</span>}
                                            {s.status === 'failed' && <span className="text-red-500 shrink-0">✗</span>}
                                            <span className={`truncate ${s.status === 'failed' ? 'text-red-600' : s.status === 'done' ? 'text-green-700' : 'text-slate-600'}`}>
                                                {s.fileName}
                                                {s.status === 'compressing' && ' — 압축 중'}
                                                {s.status === 'uploading' && ' — 업로드 중'}
                                                {s.status === 'done' && ' — 완료'}
                                                {s.status === 'failed' && ` — 실패${s.error ? `: ${s.error}` : ''}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
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


                            <div className="relative w-full h-full bg-black/80 rounded-lg overflow-hidden flex items-center justify-center">
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
