const fs = require('fs');
const path = require('path');

const baseResDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const logoPath = path.join(__dirname, 'public', 'logos', 'nfx-circle.png');

console.log('Source logo path:', logoPath);

if (!fs.existsSync(logoPath)) {
  console.error("Logo not found!");
  process.exit(1);
}

const folders = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];

// Create folders if they don't exist and copy the icons
folders.forEach(folder => {
  const dirPath = path.join(baseResDir, folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Copy standard icon
  fs.copyFileSync(logoPath, path.join(dirPath, 'ic_launcher.png'));
  
  // Copy round icon
  fs.copyFileSync(logoPath, path.join(dirPath, 'ic_launcher_round.png'));
  
  // Copy foreground icon
  fs.copyFileSync(logoPath, path.join(dirPath, 'ic_launcher_foreground.png'));

  console.log(`Copied icons to ${folder}`);
});

// Delete anydpi-v26 XMLs which override PNGs on Android 8+
const anyDpiDir = path.join(baseResDir, 'mipmap-anydpi-v26');
if (fs.existsSync(anyDpiDir)) {
  fs.rmSync(anyDpiDir, { recursive: true, force: true });
  console.log('Deleted anydpi-v26 XMLs (disabling Adaptive Icons)');
}

console.log('Done!');
