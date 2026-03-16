import exifr from 'exifr'

/**
 * Checks if a given image file was taken using Samsung Galaxy's "Portrait Mode" (인물 사진 모드)
 * 
 * Heuristics:
 * 1. Filename contains "portrait" (Samsung default naming convention often appends _Portrait)
 * 2. EXIF Make is "Samsung" and contains typical depth/bokeh markers.
 *    - In some cases, portrait photos are unusually large and contain XMP depth metadata.
 */
export async function isGalaxyPortraitMode(file: File): Promise<boolean> {
    const name = file.name.toLowerCase()
    
    // Quick heuristic: Samsung sometimes names these files like "20240315_120000_Portrait.jpg" 
    // or "20240315_120000_Bokeh.jpg"
    if (name.includes('portrait') || name.includes('bokeh')) {
        return true
    }

    try {
        // Read basic EXIF data
        const exif = await exifr.parse(file, ['Make', 'Software', 'Mode', 'ExposureMode', 'SceneCaptureType'])
        if (!exif) return false

        const make = (exif.Make || '').toString().toLowerCase()
        const software = (exif.Software || '').toString().toLowerCase()

        // Check if the device is a Samsung
        if (make.includes('samsung')) {
            // Samsung's portrait mode often flags "portrait" or "bokeh" in the Software tag 
            // or specific internal tags.
            if (software.includes('portrait') || software.includes('bokeh')) {
                return true
            }

            // Depth Map / XMP check
            // We can check if `exifr` parsed any depth/bokeh related tags
            try {
                const xmp = await exifr.parse(file, { xmp: true })
                if (xmp) {
                    const xmpStr = JSON.stringify(xmp).toLowerCase()
                    if (xmpStr.includes('depth') || xmpStr.includes('bokeh') || xmpStr.includes('portrait')) {
                        return true
                    }
                }
            } catch (xmpErr) {
                // XMP parsing might fail, ignore
            }
        }
    } catch (e) {
        // EXIF parsing failed, assume it's normal to not block valid images
        console.error("Portrait check EXIF error:", e)
    }

    return false
}
