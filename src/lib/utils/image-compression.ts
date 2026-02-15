import imageCompression from 'browser-image-compression'

// 모바일 환경 감지
function isMobile(): boolean {
    if (typeof navigator === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 타임아웃 래퍼
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('압축 시간 초과')), ms)
        ),
    ])
}

export async function compressImage(file: File): Promise<File> {
    const mobile = isMobile()

    const options = {
        maxSizeMB: mobile ? 0.3 : 0.5,           // 모바일: 300KB, 데스크탑: 500KB
        maxWidthOrHeight: mobile ? 1024 : 1280,    // 모바일: 1024px, 데스크탑: 1280px
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
        initialQuality: mobile ? 0.6 : 0.7         // 모바일: 60%, 데스크탑: 70%
    }

    try {
        // 15초 타임아웃 적용
        const compressedFile = await withTimeout(
            imageCompression(file, options),
            15000
        )

        if (compressedFile.type !== 'image/jpeg') {
            return new File(
                [compressedFile],
                file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                { type: 'image/jpeg' }
            )
        }
        return compressedFile
    } catch (error) {
        console.warn('Image compression failed or timed out, using fallback:', error)

        // 폴백: Canvas를 사용한 간단한 리사이즈
        try {
            return await fallbackResize(file, mobile ? 1024 : 1280)
        } catch {
            // 최종 폴백: 원본 반환
            return file
        }
    }
}

// Canvas 기반 빠른 폴백 리사이즈
async function fallbackResize(file: File, maxDim: number): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)

            let { width, height } = img
            if (width <= maxDim && height <= maxDim) {
                resolve(file)
                return
            }

            const ratio = Math.min(maxDim / width, maxDim / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (!ctx) { reject(new Error('Canvas not supported')); return }
            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
                (blob) => {
                    if (!blob) { reject(new Error('Blob creation failed')); return }
                    resolve(new File(
                        [blob],
                        file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                        { type: 'image/jpeg' }
                    ))
                },
                'image/jpeg',
                0.6
            )
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Image load failed'))
        }

        img.src = url
    })
}

// 여러 이미지를 동시에 압축 (병렬 처리, 최대 3개씩)
export async function compressImages(files: File[]): Promise<File[]> {
    const results: File[] = []
    const batchSize = 3

    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)
        const compressed = await Promise.all(batch.map(f => compressImage(f)))
        results.push(...compressed)
    }

    return results
}
