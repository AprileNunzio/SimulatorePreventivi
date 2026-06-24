const { Jimp } = require('jimp');
const { execSync } = require('child_process');

async function createIcon() {
  try {
    const image = new Jimp({ width: 256, height: 256, color: 0x1d4ed8ff });
    await image.write('assets/icon_valid.png');
    execSync('npx png-to-ico assets/icon_valid.png > assets/icon.ico', { stdio: 'inherit' });
    console.log('Valid icon.ico created successfully!');
  } catch (e) {
    console.error('Error:', e);
  }
}

createIcon();
