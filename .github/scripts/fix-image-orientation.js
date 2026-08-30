const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const photosDir = './photos';

async function fixImageOrientation() {
  const countries = fs.readdirSync(photosDir).filter(file => {
    const fullPath = path.join(photosDir, file);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`Processing ${countries.length} country folders for EXIF orientation...`);

  for (const country of countries) {
    const countryPath = path.join(photosDir, country);
    const files = fs.readdirSync(countryPath).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    });

    console.log(`\n📁 Processing ${country} (${files.length} images)...`);

    for (const file of files) {
      const filePath = path.join(countryPath, file);

      try {
        // Read image metadata
        const metadata = await sharp(filePath).metadata();

        // Check if image needs rotation
        if (metadata.orientation && metadata.orientation > 1) {
          console.log(`  ⟳ ${file} (orientation: ${metadata.orientation})`);

          // Use sharp to auto-rotate and remove EXIF
          await sharp(filePath)
            .rotate() // Auto-rotates based on EXIF orientation
            .toFile(filePath + '.tmp');

          // Replace original with rotated version
          fs.renameSync(filePath + '.tmp', filePath);
        }
      } catch (error) {
        console.log(`  ⚠️  ${file}: ${error.message}`);
      }
    }
  }

  console.log('\n✨ EXIF orientation fix complete!');
}

// Install sharp if not present
try {
  require('sharp');
} catch (e) {
  console.log('Installing sharp...');
  require('child_process').execSync('npm install sharp', { stdio: 'inherit' });
}

fixImageOrientation().catch(console.error);
