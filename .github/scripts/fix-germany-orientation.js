const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function fixGermanyOrientation() {
  const countryPath = path.join('.', 'photos', 'germany');
  const files = fs.readdirSync(countryPath).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  console.log(`Processing ${files.length} Germany images for embedded orientation...`);
  let fixed = 0;

  for (const file of files) {
    const filePath = path.join(countryPath, file);
    let tempPath;

    try {
      const metadata = await sharp(filePath).metadata();
      if (metadata.orientation && metadata.orientation > 1) {
        const ext = path.extname(file);
        tempPath = path.join(countryPath, `.${file}.oriented${ext}`);

        await sharp(filePath)
          .rotate()
          .toFile(tempPath);

        fs.renameSync(tempPath, filePath);
        fixed++;
        console.log(`Fixed ${file} (orientation ${metadata.orientation})`);
      }
    } catch (err) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      console.log(`Skipped ${file}: ${err.message}`);
    }
  }

  console.log(`Germany orientation correction complete: ${fixed} fixed`);
}

fixGermanyOrientation().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
