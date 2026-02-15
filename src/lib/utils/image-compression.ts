import imageCompression from 'browser-image-compression'

export async function compressImage(file: File) {
    const options = {
        maxSizeMB: 0.5,             // 500KB max - 모바일에서 충분한 품질
        maxWidthOrHeight: 1280,     // 모바일 화면 기준 적정 크기
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
        initialQuality: 0.7         // 모바일 최적 품질
    }

    try {
        const compressedFile = await imageCompression(file, options)
        if (compressedFile.type !== 'image/jpeg') {
            return new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' })
        }
        return compressedFile
    } catch (error) {
        console.error('Image compression failed:', error)
        return file
    }
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
