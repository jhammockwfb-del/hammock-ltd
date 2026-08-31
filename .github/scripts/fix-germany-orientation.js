const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const countryPath = path.join('.', 'photos', 'germany');
const markerPath = path.join(countryPath, '.manual-orientation-fixed-v4');

// Four final 180-degree corrections confirmed by direct visual inspection.
// Degrees are clockwise relative to the currently published files.
const rotations = {
  'germany_038.jpg': 180,
  'germany_039.jpg': 180,
  'germany_041.jpg': 180,
  'germany_050.jpg': 180
};

async function fixGermanyOrientation() {
  if (fs.existsSync(markerPath)) {
    console.log('Germany orientation correction v4 already applied; nothing to do.');
    return;
  }

  let fixed = 0;
  for (const [file, degrees] of Object.entries(rotations)) {
    const filePath = path.join(countryPath, file);
    const ext = path.extname(file);
    const tempPath = path.join(countryPath, `.${file}.rotated${ext}`);

    if (!fs.existsSync(filePath)) throw new Error(`Missing ${file}`);
    await sharp(filePath).rotate(degrees).toFile(tempPath);
    fs.renameSync(tempPath, filePath);
    fixed++;
    console.log(`Rotated ${file} ${degrees} degrees clockwise`);
  }

  fs.writeFileSync(markerPath, `Applied Germany orientation corrections v4 to ${fixed} images.\n`);
  console.log(`Germany orientation correction v4 complete: ${fixed} fixed`);
}

fixGermanyOrientation().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
