/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 글로벌 업로드 매니저 (싱글톤)
 * 페이지 이동해도 업로드가 계속 진행됩니다.
 */

import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export interface UploadItem {
    id: string
    fileName: string
    status: 'queued' | 'compressing' | 'uploading' | 'done' | 'failed'
    error?: string
    siteId: string
    type: string
}

export interface UploadBatch {
    id: string
    siteId: string
    type: string
    items: UploadItem[]
    totalCount: number
    doneCount: number
    failCount: number
}

type Listener = () => void

class UploadManager {
    private static instance: UploadManager
    private batches: Map<string, UploadBatch> = new Map()
    private listeners: Set<Listener> = new Set()
    private processing = false

    static getInstance(): UploadManager {
        if (!UploadManager.instance) {
            UploadManager.instance = new UploadManager()
        }
        return UploadManager.instance
    }

    // React 상태 동기화용
    subscribe(listener: Listener) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    private notify() {
        this.listeners.forEach(l => l())
    }

    getActiveBatches(): UploadBatch[] {
        return Array.from(this.batches.values()).filter(
            b => b.doneCount + b.failCount < b.totalCount ||
                // 완료 후 5초간 표시 유지
                Date.now() - (b as any)._completedAt < 5000
        )
    }

    getAllBatches(): UploadBatch[] {
        return Array.from(this.batches.values())
    }

    async addFiles(files: File[], siteId: string, type: string) {
        const batchId = uuidv4()
        const items: UploadItem[] = files.map(f => ({
            id: uuidv4(),
            fileName: f.name,
            status: 'queued' as const,
            siteId,
            type,
        }))

        const batch: UploadBatch = {
            id: batchId,
            siteId,
            type,
            items,
            totalCount: files.length,
            doneCount: 0,
            failCount: 0,
        }

        this.batches.set(batchId, batch)
        this.notify()

        // 백그라운드 처리 시작
        this.processFiles(batchId, files).catch(console.error)
    }

    private async processFiles(batchId: string, files: File[]) {
        const batch = this.batches.get(batchId)
        if (!batch) return

        const { compressImage } = await import('@/lib/utils/image-compression')
        const { insertPhotoRecord } = await import('@/actions/worker')
        const supabase = createClient()

        // 2개씩 병렬 처리 (모바일 연결 제한 대응)
        const concurrency = 2
        let index = 0

        const processOne = async () => {
            while (index < files.length) {
                const i = index++
                const file = files[i]
                const item = batch.items[i]

                try {
                    // 압축
                    item.status = 'compressing'
                    this.notify()

                    const compressed = await compressImage(file)

                    // 업로드
                    item.status = 'uploading'
                    this.notify()

                    const fileName = `${batch.siteId}/${batch.type}/${uuidv4()}-${compressed.name}`

                    // 재시도 포함 업로드
                    let lastError: any = null
                    for (let attempt = 0; attempt <= 2; attempt++) {
                        try {
                            const { error: uploadError } = await supabase
                                .storage
                                .from('site-photos')
                                .upload(fileName, compressed, {
                                    contentType: 'image/jpeg',
                                    upsert: true,
                                })
                            if (uploadError) throw uploadError
                            lastError = null
                            break
                        } catch (e) {
                            lastError = e
                            if (attempt < 2) {
                                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
                            }
                        }
                    }
                    if (lastError) throw lastError

                    // Public URL
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from('site-photos')
                        .getPublicUrl(fileName)

                    // DB insert
                    const result = await insertPhotoRecord(batch.siteId, publicUrl, batch.type as any)
                    if (!result.success) throw new Error(result.error || 'DB 저장 실패')

                    item.status = 'done'
                    batch.doneCount++
                } catch (error) {
                    console.error(`Upload failed: ${file.name}`, error)
                    item.status = 'failed'
                    item.error = (error as Error).message
                    batch.failCount++
                }

                this.notify()
            }
        }

        // 2개 워커 동시 실행
        const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => processOne())
        await Promise.all(workers)

            // 완료 마킹
            ; (batch as any)._completedAt = Date.now()
        this.notify()

        // 10초 후 배치 제거
        setTimeout(() => {
            this.batches.delete(batchId)
            this.notify()
        }, 10000)
    }
}

export const uploadManager = UploadManager.getInstance()
