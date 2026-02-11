import imageCompression from 'browser-image-compression'

export async function compressImage(file: File) {
    const options = {
        maxSizeMB: 1,              // 1MB max file size
        maxWidthOrHeight: 1920,    // Full HD is enough for mobile viewing
        useWebWorker: true,
        fileType: 'image/jpeg',    // Force convert to JPEG
        initialQuality: 0.8        // Good balance
    }

    try {
        const compressedFile = await imageCompression(file, options)
        // Ensure the file extension is .jpg
        if (compressedFile.type !== 'image/jpeg') {
            // Usually browser-image-compression handles this, but double check
            return new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' })
        }
        return compressedFile
    } catch (error) {
        console.error('Image compression failed:', error)
        // If compression fails, we should still try to return a displayable format if possible, 
        // but returning the original (if RAW) will persist the bug. 
        // However, we can't do much if the lib fails.
        return file
    }
}
