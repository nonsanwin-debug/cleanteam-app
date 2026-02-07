import imageCompression from 'browser-image-compression'

export async function compressImage(file: File) {
    const options = {
        maxSizeMB: 1,          // 1MB max file size
        maxWidthOrHeight: 1280, // Max width/height
        useWebWorker: true,
    }

    try {
        const compressedFile = await imageCompression(file, options)
        return compressedFile
    } catch (error) {
        console.error('Image compression failed:', error)
        return file // Fallback to original
    }
}
