const fs = require('fs');
const path = require('path');

const src1 = 'C:\\Users\\UserPC\\.gemini\\antigravity\\brain\\34e9d379-09d4-4a35-a293-d237c347de7c\\media__1773506277005.png';
const dest1 = path.join(__dirname, 'public', 'logos', 'logo-wide.png');

const src2 = 'C:\\Users\\UserPC\\.gemini\\antigravity\\brain\\34e9d379-09d4-4a35-a293-d237c347de7c\\media__1773506273955.png';
const dest2 = path.join(__dirname, 'public', 'logos', 'nfx-circle.png');

try {
  fs.copyFileSync(src1, dest1);
  console.log('Copied logo-wide.png successfully!');
  fs.copyFileSync(src2, dest2);
  console.log('Copied nfx-circle.png successfully!');
} catch (e) {
  console.error('Error copying files:', e.message);
}
