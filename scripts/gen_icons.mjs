import fs from 'fs';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.resolve(__dirname, '..', 'public', 'icons', 'nexus-logo.svg');
const sizes = [192, 512];

async function generate() {
    for (const size of sizes) {
        await sharp(svgPath, { density: 300 })
            .resize(size, size)
            .png()
            .toFile(path.resolve(__dirname, '..', 'public', 'icons', `icon-${size}.png`));
        console.log(`Generated icon-${size}.png`);
    }
    
    // Apple Touch Icon
    await sharp(svgPath, { density: 300 })
        .resize(180, 180)
        .png()
        .toFile(path.resolve(__dirname, '..', 'src', 'app', `apple-icon.png`));
    console.log(`Generated apple-icon.png`);
        
    // Favicon (as PNG for better Next.js support alongside ICO or replacing it)
    await sharp(svgPath, { density: 300 })
        .resize(32, 32)
        .png()
        .toFile(path.resolve(__dirname, '..', 'src', 'app', `favicon.png`));
    console.log(`Generated favicon.png`);
}
generate().catch(console.error);
