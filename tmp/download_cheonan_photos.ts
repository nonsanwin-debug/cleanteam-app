import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import * as stream from 'stream'
import { promisify } from 'util'
import { execSync } from 'child_process'

dotenv.config({ path: '.env.local' })

const pipeline = promisify(stream.pipeline)

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function download() {
    console.log("Fetching sites in Cheonan and Asan...")
    
    // Get sites
    const { data: sites, error: siteErr } = await supabase
        .from('sites')
        .select('id, name, address, cleaning_date')
        .or('address.ilike.%천안%,address.ilike.%아산%')
        .order('created_at', { ascending: false })
    if (siteErr) console.error("Sites error:", siteErr)
    
    if (!sites || sites.length === 0) {
        console.log("No sites found.")
        return
    }

    const baseFolder = path.join(process.cwd(), '../천안_아산_현장_사진')
    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder, { recursive: true })
    }

    let downloadCount = 0;
    let siteWithPhotos = 0;

    for (const site of sites) {
        process.stdout.write(`Checking ${site.name}... `)
        const { data: photos, error: photoErr } = await supabase
            .from('photos')
            .select('*')
            .eq('site_id', site.id)
            .order('created_at', { ascending: true })
        
        if (photoErr) console.error(photoErr)

        if (!photos || photos.length === 0) {
            console.log(`no photos.`)
            continue
        }
        
        console.log(`found ${photos.length} photos. Downloading...`)
        siteWithPhotos++

        const safeDirName = `${site.name}_${site.cleaning_date}`.replace(/[\\/:*?"<>|]/g, "_").trim()
        const siteFolder = path.join(baseFolder, safeDirName || 'Unknown Site')
        
        if (!fs.existsSync(siteFolder)) {
            fs.mkdirSync(siteFolder, { recursive: true })
        }

        const counter: Record<string, number> = {}

        for (const photo of photos) {
            try {
                const url = photo.url || photo.file_url || photo.public_url;
                if (!url) continue;

                const category = photo.category || photo.type || 'photo'
                const extMatch = url.match(/\.([^.?#]+)(\?.*)?$/)
                let ext = extMatch ? extMatch[1] : 'jpg'
                if (ext.length > 5) ext = 'jpg';

                counter[category] = (counter[category] || 0) + 1
                const filename = `${category}_${counter[category]}.${ext}`
                const destPath = path.join(siteFolder, filename)

                const res = await fetch(url)
                if (!res.ok) throw new Error(`HTTP ${res.statusText}`)
                
                const fileStream = fs.createWriteStream(destPath)
                if (res.body) {
                    // @ts-ignore
                    await pipeline(res.body, fileStream)
                    downloadCount++;
                }
            } catch (e: any) {
                console.error(`  -> Failed to download: ${e.message}`)
            }
        }
    }

    console.log(`\n✅ Finished downloading ${downloadCount} photos across ${siteWithPhotos} sites to ${baseFolder}.`)
    console.log(`Zipping the folder to Desktop...`)
    const zipPath = path.join(process.cwd(), '../천안_아산_현장_사진.zip')
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
    
    try {
        execSync(`powershell -Command "Compress-Archive -Path '${baseFolder}\\*' -DestinationPath '${zipPath}' -Force"`)
        console.log(`✅ Zipped successfully to ${zipPath}`)
    } catch(e) {
        console.error("Zipping failed:", e)
    }
}

download()
