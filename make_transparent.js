const Jimp = require('jimp');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'logos', 'nfx-circle.png');
// We write to the artifact dir so the user can easily see it in the UI
const outputPath = 'C:\\Users\\UserPC\\.gemini\\antigravity\\brain\\34e9d379-09d4-4a35-a293-d237c347de7c\\transparent_n_logo.png';

async function processImage() {
    try {
        const image = await Jimp.read(inputPath);
        
        // Ensure it's a square
        const size = Math.max(image.bitmap.width, image.bitmap.height);
        
        // Create a new blank transparent image
        const newImage = new Jimp(size, size, 0x00000000);
        
        // Composite the original image centered into the new blank canvas
        const xOffset = (size - image.bitmap.width) / 2;
        const yOffset = (size - image.bitmap.height) / 2;
        newImage.composite(image, xOffset, yOffset);

        // Remove white background with basic anti-aliasing
        newImage.scan(0, 0, newImage.bitmap.width, newImage.bitmap.height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            
            // Calculate lightness
            const maxRGB = Math.max(r, g, b);
            const minRGB = Math.min(r, g, b);
            const l = (maxRGB + minRGB) / 2;
            
            // The white background we want to remove is generally very bright and low saturation
            // If it's pure or almost pure white
            if (r > 240 && g > 240 && b > 240) {
                this.bitmap.data[idx + 3] = 0; // Fully transparent
            } else if (r > 220 && g > 220 && b > 220) {
                // Soft edge blending for pixels close to white
                // The closer to 255, the more transparent
                const avg = (r + g + b) / 3;
                const alpha = Math.floor(255 * ((250 - avg) / (250 - 220)));
                this.bitmap.data[idx + 3] = Math.max(0, Math.min(255, alpha));
            }
        });

        // Add 15% padding around the logo so it fits perfectly inside Android's circle
        const paddedSize = Math.floor(size * 1.3);
        const finalImage = new Jimp(paddedSize, paddedSize, 0x00000000);
        finalImage.composite(newImage.resize(size, size), (paddedSize - size) / 2, (paddedSize - size) / 2);

        await finalImage.writeAsync(outputPath);
        console.log('Transparent image created successfully at:', outputPath);
    } catch (e) {
        console.error('Error processing image:', e);
    }
}

processImage();
