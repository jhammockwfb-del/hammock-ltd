const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function fixImageOrientation() {
  const photosDir = './photos';

  // Get all country folders
  const countries = fs.readdirSync(photosDir).filter(file => {
    const fullPath = path.join(photosDir, file);
    return fs.statSync(fullPath).isDirectory() && file !== '.DS_Store';
  });

  console.log(`\n📁 Processing ${countries.length} country folders for image orientation...\n`);

  for (const country of countries) {
    const countryPath = path.join(photosDir, country);

    // Get all image files
    const files = fs.readdirSync(countryPath).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    });

    if (files.length === 0) continue;

    console.log(`🔧 ${country}: processing ${files.length} images...`);
    let fixed = 0;

    for (const file of files) {
      const filePath = path.join(countryPath, file);

      try {
        // Read metadata
        const metadata = await sharp(filePath).metadata();

        // Check if orientation needs fixing
        if (metadata.orientation && metadata.orientation > 1) {
          // Rotate and save
          await sharp(filePath)
            .rotate()
            .toFile(filePath);

          fixed++;
        }
      } catch (err) {
        console.log(`   ⚠️  ${file}: skipped (${err.message})`);
      }
    }

    if (fixed > 0) {
      console.log(`   ✅ Fixed ${fixed} image${fixed === 1 ? '' : 's'}`);
    }
  }

  console.log('\n✨ Image orientation fix complete!\n');
}

fixImageOrientation().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
