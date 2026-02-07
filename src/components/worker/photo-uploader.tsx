/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef } from 'react'
import { uploadPhoto } from '@/actions/worker'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Camera, Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface PhotoUploaderProps {
    siteId: string
    existingPhotos: any[]
}

export function PhotoUploader({ siteId, existingPhotos }: PhotoUploaderProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [tab, setTab] = useState<'before' | 'during' | 'after'>('before')
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // 1. Compress
            toast.info('사진 최적화 중...', { duration: 1000 })
            // Since compressImage is in a separate file, we need to import it or define it.
            // Assuming we imported it from props or a dynamic import if needed, 
            // but here we use a simple fetch to the collection action wrapper

            // Note: We need to import 'compressImage' from client utils. 
            // Re-implementing logic here briefly or ensuring import works.
            // We will assume the import at the top works.

            // Dynamic import for client side library if needed
            const { compressImage } = await import('@/lib/utils/image-compression')
            const compressedFile = await compressImage(file)

            // 2. Upload
            const formData = new FormData()
            formData.append('file', compressedFile)
            formData.append('siteId', siteId)
            formData.append('type', tab)

            await uploadPhoto(formData)
            toast.success('사진이 업로드되었습니다.')

            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (error) {
            toast.error('업로드 실패', { description: (error as Error).message })
        } finally {
            setIsUploading(false)
        }
    }

    const currentPhotos = existingPhotos.filter(p => p.type === tab)

    return (
        <div className="space-y-4">
            <Tabs defaultValue="before" onValueChange={(v) => setTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="before">작업 전</TabsTrigger>
                    <TabsTrigger value="during">작업 중</TabsTrigger>
                    <TabsTrigger value="after">작업 후</TabsTrigger>
                </TabsList>

                <div className="space-y-4">
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-6">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <Button
                                variant="outline"
                                className="h-24 w-full flex flex-col gap-2"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                ) : (
                                    <Upload className="h-8 w-8 text-primary" />
                                )}
                                <span>{isUploading ? '업로드 중...' : '사진 업로드'}</span>
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-2">
                        {currentPhotos.length === 0 ? (
                            <div className="col-span-2 text-center py-8 text-slate-400 bg-slate-50 rounded text-sm">
                                등록된 사진이 없습니다.
                            </div>
                        ) : (
                            currentPhotos.map((photo) => (
                                <div key={photo.id} className="relative aspect-square rounded overflow-hidden border bg-slate-100">
                                    <Image
                                        src={photo.url}
                                        alt="Work photo"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Tabs>
        </div>
    )
}
